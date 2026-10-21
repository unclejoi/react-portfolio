import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEmbedding } from './providers.js';

test('embedding normalization returns a unit vector without mutating provider values', () => {
  const values = [3, 4];
  assert.deepEqual(normalizeEmbedding(values, 2), [0.6, 0.8]);
  assert.deepEqual(values, [3, 4]);
  const normalized = normalizeEmbedding([-1, 2, -3], 3);
  assert.ok(Math.abs(Math.hypot(...normalized) - 1) < 1e-12);
});

test('missing, wrong-dimensional, nonfinite, and zero embeddings fail closed', () => {
  for (const values of [undefined, [], [1], [1, 2, 3], [Number.NaN, 1], [Number.POSITIVE_INFINITY, 1], [Number.NEGATIVE_INFINITY, 1], [0, 0]]) {
    assert.throws(() => normalizeEmbedding(values, 2), /invalid embedding|empty embedding/);
  }
});

test('finite vector entries whose combined norm overflows cannot produce a zero embedding', () => {
  assert.throws(() => normalizeEmbedding([1e308, 1e308, 1e308, 1e308], 4), /embedding/);
});
