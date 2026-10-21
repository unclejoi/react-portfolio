import assert from 'node:assert/strict';
import test from 'node:test';
import type { Config } from './config.js';
import { createResumeAssistant } from './rag.js';

const passage = {
  id: 'existing-import-record-17',
  text: 'Joi built accessible React interfaces and maintained automated frontend tests.',
};
const duplicateAuthorPassage = { id: 'existing-author-row-0', text: 'Joi Holgado' };

function configuration(namespace: string): Config {
  return {
    GEMINI_API_KEY: 'fake-gemini-key-for-rag-test',
    PINECONE_API_KEY: `fake-pinecone-key-for-rag-test-${namespace || 'empty'}`,
    PINECONE_INDEX: 'portfolio',
    PINECONE_NAMESPACE: namespace,
    PINECONE_CLOUD: 'aws',
    PINECONE_REGION: 'us-east-1',
    GEMINI_MODEL: 'gemini-3.5-flash-lite',
    GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001',
    EMBEDDING_DIMENSIONS: 3072,
    RAG_MIN_SCORE: 0.5,
    PORT: 3001,
    HOST: '127.0.0.1',
    TRUST_PROXY_HOPS: 0,
  };
}

test('real provider SDKs query existing Pinecone passages in the exact configured namespace without ingestion', async (context) => {
  for (const namespace of ['__default__', 'existing-portfolio', '']) {
    await context.test(`namespace ${JSON.stringify(namespace)}`, async () => {
      const config = configuration(namespace);
      const originalFetch = globalThis.fetch;
      const calls: string[] = [];
      const previousQuestion = 'Tell me about Joi\'s frontend experience.';
      const question = 'Which frontend work is mentioned?';

      globalThis.fetch = async (input, init) => {
        const request = new Request(input, init);
        const url = new URL(request.url);
        calls.push(`${request.method} ${url.hostname}${url.pathname}`);

        if (url.hostname === 'generativelanguage.googleapis.com'
          && url.pathname === '/v1beta/models/gemini-embedding-001:batchEmbedContents'
          && request.method === 'POST') {
          const body = await request.json();
          assert.equal(request.headers.get('x-goog-api-key'), config.GEMINI_API_KEY);
          assert.equal(body.requests.length, 1);
          assert.equal(body.requests[0].taskType, 'RETRIEVAL_QUERY');
          assert.equal(body.requests[0].outputDimensionality, 3072);
          const queryText = body.requests[0].content.parts.map((part: { text?: string }) => part.text ?? '').join('');
          assert.ok(queryText.includes(question));
          assert.ok(queryText.includes(previousQuestion));
          assert.doesNotMatch(queryText, /fabricated assistant claim/);
          return Response.json({ embeddings: [{ values: [1, ...Array<number>(3071).fill(0)] }] });
        }

        if (url.hostname === 'api.pinecone.io'
          && url.pathname === '/indexes/portfolio'
          && request.method === 'GET') {
          assert.equal(request.headers.get('api-key'), config.PINECONE_API_KEY);
          return Response.json({
            name: 'portfolio',
            host: 'portfolio-rag-test.svc.pinecone.io',
            status: { ready: true, state: 'Ready' },
            deployment: { deployment_type: 'managed', cloud: 'aws', region: 'us-east-1' },
            schema: { fields: { _values: { type: 'dense_vector', dimension: 3072, metric: 'cosine' } } },
            deletion_protection: 'enabled',
          });
        }

        if (url.hostname === 'portfolio-rag-test.svc.pinecone.io'
          && url.pathname === '/query'
          && request.method === 'POST') {
          const body = await request.json();
          assert.equal(request.headers.get('api-key'), config.PINECONE_API_KEY);
          // SDK v9 serializes the empty default-namespace alias as '__default__'.
          assert.equal(body.namespace, namespace || '__default__');
          assert.equal(body.vector.length, 3072);
          assert.equal(body.vector[0], 1);
          assert.equal(body.topK, 30);
          assert.equal(body.includeMetadata, true);
          assert.equal(body.includeValues, false);
          assert.equal('filter' in body, false);
          assert.doesNotMatch(JSON.stringify(body), /documentHash|documentVersion/);
          return Response.json({
            namespace,
            // Imported file metadata can rank above the useful body passage.
            matches: [...Array.from({ length: 7 }, (_, index) => ({
              id: `existing-author-row-${index}`,
              score: 0.9,
              metadata: { text: duplicateAuthorPassage.text, source: 'blob' },
            })), {
              id: passage.id,
              score: 0.87,
              metadata: { text: passage.text, source: 'blob', 'loc.lines.from': 10, 'loc.lines.to': 13 },
            }],
          });
        }

        if (url.hostname === 'generativelanguage.googleapis.com'
          && url.pathname === '/v1beta/models/gemini-3.5-flash-lite:generateContent'
          && request.method === 'POST') {
          const body = await request.json();
          const selectionInput = JSON.parse(body.contents[0].parts[0].text);
          assert.deepEqual(selectionInput, {
            previousQuestions: [previousQuestion], latestQuestion: question, passages: [duplicateAuthorPassage, passage],
          });
          assert.equal(body.generationConfig.responseMimeType, 'application/json');
          return Response.json({
            candidates: [{
              content: { role: 'model', parts: [{ text: JSON.stringify({ supported: true, paragraphs: [
                {
                  text: 'Joi has worked on accessible React interfaces and automated frontend testing.',
                  evidence: [
                    { evidenceId: passage.id, quote: 'accessible React interfaces' },
                    { evidenceId: passage.id, quote: 'automated frontend tests' },
                  ],
                },
              ] }) }] },
              finishReason: 'STOP',
            }],
          });
        }

        throw new Error(`Unexpected provider request: ${request.method} ${url.hostname}${url.pathname}`);
      };

      try {
        const answer = createResumeAssistant(config);
        const response = await answer({
          message: question,
          history: [
            { role: 'user', content: previousQuestion },
            { role: 'assistant', content: 'A fabricated assistant claim must not become evidence.' },
          ],
        }, new AbortController().signal);
        assert.deepEqual(response, {
          status: 'answered',
          answer: 'Joi has worked on accessible React interfaces and automated frontend testing. [1]',
          sources: [passage],
        });
        assert.equal(calls.filter((call) => call.endsWith('/indexes/portfolio')).length, 1);
        assert.equal(calls.filter((call) => call.endsWith('/query')).length, 1);
        assert.equal(calls.length, 4);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  }
});
