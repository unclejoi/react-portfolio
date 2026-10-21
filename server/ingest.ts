import { setTimeout as delay } from 'node:timers/promises';
import { isConfigured, loadConfig } from './config.js';
import { createGemini, createPinecone, embed } from './providers.js';
import { documentVersion, loadResume, resumeNamespace } from './resume.js';

let step = 'loading configuration';

async function ingest() {
  const config = loadConfig();
  if (!isConfigured(config)) throw new Error('Set GEMINI_API_KEY and PINECONE_API_KEY in .env before ingesting the resume.');
  step = 'reading the resume PDF';
  const document = await loadResume();
  const version = documentVersion(document, config.GEMINI_EMBEDDING_MODEL, config.EMBEDDING_DIMENSIONS);
  const pinecone = createPinecone(config);
  step = 'listing Pinecone indexes';
  const indexes = await pinecone.indexes.list();
  if (!indexes.indexes?.some((index) => index.name === config.PINECONE_INDEX)) {
    console.log(`Creating Pinecone index "${config.PINECONE_INDEX}" (${config.EMBEDDING_DIMENSIONS} dimensions, cosine).`);
    step = 'creating the Pinecone index';
    await pinecone.indexes.create({
      name: config.PINECONE_INDEX,
      schema: { fields: { _values: { type: 'dense_vector', dimension: config.EMBEDDING_DIMENSIONS, metric: 'cosine' } } },
      deployment: { deploymentType: 'managed', cloud: config.PINECONE_CLOUD, region: config.PINECONE_REGION },
      waitUntilReady: true,
      timeout: 120_000,
    });
  }
  step = 'checking the Pinecone index configuration';
  const model = await pinecone.indexes.describe(config.PINECONE_INDEX);
  const field = model.schema?.fields?._values;
  if (!field || !('type' in field) || field.type !== 'dense_vector' || field.dimension !== config.EMBEDDING_DIMENSIONS || field.metric !== 'cosine') {
    const actual = field && 'dimension' in field ? `${field.dimension} dimensions, ${'metric' in field ? field.metric : 'unknown metric'}` : 'no compatible dense vector field';
    throw new Error(`Pinecone index "${config.PINECONE_INDEX}" has ${actual}. Use a dense vector index with ${config.EMBEDDING_DIMENSIONS} dimensions and cosine metric. Set PINECONE_INDEX to a new name to create a matching index.`);
  }
  const index = pinecone.index({ host: model.host, namespace: resumeNamespace(config.PINECONE_NAMESPACE, version) });
  const ai = createGemini(config);
  const records = [];
  // Sequential embedding avoids bursts on smaller Gemini quotas.
  step = 'embedding resume passages with Gemini';
  for (const chunk of document.chunks) {
    records.push({
      id: chunk.id,
      values: await embed(ai, config, chunk.text, 'RETRIEVAL_DOCUMENT'),
      metadata: {
        documentHash: document.hash,
        documentVersion: version,
        page: chunk.page,
        source: 'joi-emmanuel-holgado-resume.pdf',
        embeddingModel: config.GEMINI_EMBEDDING_MODEL,
        dimensions: config.EMBEDDING_DIMENSIONS,
      },
    });
  }
  step = 'uploading resume vectors to Pinecone';
  await index.upsert({ records });
  // Upserts are eventually consistent. Verify every record is queryable before reporting success.
  step = 'verifying that resume vectors are searchable';
  const deadline = Date.now() + 60_000;
  while (true) {
    const visible = await Promise.all(records.map(async (record) => {
      const response = await index.query({ vector: record.values, topK: records.length, includeMetadata: true, filter: { documentVersion: { $eq: version } } });
      return response.matches.some((match) => match.id === record.id);
    }));
    if (visible.every(Boolean)) break;
    if (Date.now() >= deadline) throw new Error('Vectors were uploaded but are not all searchable yet. Wait a moment and rerun ingestion.');
    await delay(1500);
  }
  console.log(`Indexed ${records.length} resume passages. Document version: ${version.slice(0, 12)}. Restart the API if the PDF changed.`);
  // Keep prior versions intact; query filters exclude them. Never clear a shared namespace.
}

ingest().catch((error: unknown) => {
  // Provider errors can contain request details; log only an error type and our own safe setup errors.
  const type = error instanceof Error && /^[A-Za-z][A-Za-z0-9]*Error$/.test(error.name) ? error.name : 'ProviderError';
  console.error(error instanceof Error && error.constructor === Error ? error.message : `Resume ingestion failed while ${step} (${type}). Check API keys, model access, region, and Pinecone configuration.`);
  process.exitCode = 1;
});
