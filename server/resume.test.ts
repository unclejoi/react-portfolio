import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { chunkPages, documentVersion, loadResume, RESUME_URL, resumeNamespace } from './resume.js';

const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

test('chunking normalizes PDF whitespace while preserving line and page boundaries', () => {
  assert.deepEqual(chunkPages([
    { num: 1, text: '  Experience\r\n\tSoftware   Engineer \r\n\r\nBuilt accessible interfaces.  ' },
    { num: 2, text: ' Education\nDegree title ' },
  ], hash), [
    { id: `${hash.slice(0, 20)}-p1-0`, page: 1, text: 'Experience\nSoftware Engineer\nBuilt accessible interfaces.' },
    { id: `${hash.slice(0, 20)}-p2-1`, page: 2, text: 'Education\nDegree title' },
  ]);
  assert.deepEqual(chunkPages([{ num: 1, text: ' \n\t \r\n' }], hash), []);
});

test('chunking retains complete extracted lines and two lines of context around boundaries', () => {
  const lines = Array.from({ length: 8 }, (_, index) => `Line ${index}: ${'word '.repeat(56).trim()}`);
  const chunks = chunkPages([{ num: 3, text: lines.join('\n') }], hash);
  assert.ok(chunks.length > 1);
  assert.equal(new Set(chunks.map((chunk) => chunk.id)).size, chunks.length);
  assert.ok(chunks.every((chunk) => chunk.page === 3));
  for (const line of lines) assert.ok(chunks.some((chunk) => chunk.text.split('\n').includes(line)), `lost complete line: ${line.slice(0, 8)}`);
  for (let index = 1; index < chunks.length; index++) {
    assert.deepEqual(chunks[index].text.split('\n').slice(0, 2), chunks[index - 1].text.split('\n').slice(-2));
  }
});

test('single long PDF lines remain intact and context never crosses pages', () => {
  const longLine = `No certification in ${'subject '.repeat(300)}is claimed.`;
  const chunks = chunkPages([{ num: 1, text: longLine }, { num: 2, text: 'A second page.' }], hash);
  assert.equal(chunks[0].text, longLine);
  assert.equal(chunks[1].text, 'A second page.');
  assert.deepEqual(chunks.map((chunk) => chunk.page), [1, 2]);
});

test('document version changes with resume content, embedding model, or embedding dimensions', () => {
  const document = { hash, chunks: [] };
  const version = documentVersion(document, 'gemini-embedding-001', 768);
  assert.match(version, /^[a-f0-9]{64}$/);
  assert.equal(version, documentVersion(document, 'gemini-embedding-001', 768));
  assert.notEqual(version, documentVersion({ ...document, hash: 'replacement-resume' }, 'gemini-embedding-001', 768));
  assert.notEqual(version, documentVersion(document, 'different-embedding-model', 768));
  assert.notEqual(version, documentVersion(document, 'gemini-embedding-001', 1536));
});

test('versioned namespaces isolate deployments that reuse chunk IDs across document or embedding changes', () => {
  const document = { hash, chunks: [{ id: 'shared-chunk-id', page: 1, text: 'A resume passage.' }] };
  const versions = [
    documentVersion(document, 'gemini-embedding-001', 768),
    documentVersion(document, 'different-embedding-model', 768),
    documentVersion(document, 'gemini-embedding-001', 1536),
    documentVersion({ ...document, hash: 'replacement-resume' }, 'gemini-embedding-001', 768),
  ];
  const namespaces = versions.map((version) => resumeNamespace('joi-resume', version));
  assert.equal(new Set(namespaces).size, versions.length);
  assert.equal(resumeNamespace('joi-resume', versions[0]), namespaces[0]);
  assert.notEqual(resumeNamespace('another-portfolio', versions[0]), namespaces[0]);
  // Preserve the entire version identity so even a difference at its end stays isolated.
  assert.notEqual(resumeNamespace('joi-resume', 'a'.repeat(63) + '0'), resumeNamespace('joi-resume', 'a'.repeat(63) + '1'));
});

test('the actual portfolio resume extracts usable text with a file-derived identity', async () => {
  const path = resolve(process.cwd(), 'public', RESUME_URL.slice(1));
  const [bytes, document] = await Promise.all([readFile(path), loadResume(path)]);
  assert.equal(document.hash, createHash('sha256').update(bytes).digest('hex'));
  assert.ok(document.chunks.length > 0);
  assert.ok(document.chunks.reduce((total, chunk) => total + chunk.text.length, 0) >= 100);
  assert.match(document.chunks.map((chunk) => chunk.text).join('\n'), /Joi\s+Emmanuel\s+(?:U\.\s+)?Holgado/i);
  assert.ok(document.chunks.every((chunk) => Number.isInteger(chunk.page) && chunk.page > 0 && chunk.text.trim().length > 0));
  assert.ok(document.chunks.every((chunk) => chunk.id.startsWith(document.hash.slice(0, 20))));
  assert.equal(new Set(document.chunks.map((chunk) => chunk.id)).size, document.chunks.length);
});

test('missing resume files fail instead of substituting generated background knowledge', async () => {
  await assert.rejects(loadResume(resolve(process.cwd(), 'public', 'missing-resume-for-test.pdf')), { code: 'ENOENT' });
});
