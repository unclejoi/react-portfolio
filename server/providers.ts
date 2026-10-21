import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';
import type { Config } from './config.js';

export function createGemini(config: Config): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: config.GEMINI_API_KEY,
    httpOptions: { timeout: 15_000, retryOptions: { attempts: 1 } },
  });
}

export function createPinecone(config: Config, signal?: AbortSignal): Pinecone {
  return new Pinecone({
    apiKey: config.PINECONE_API_KEY,
    maxRetries: 0,
    fetchApi: (input, init) => fetch(input, {
      ...init,
      signal: AbortSignal.any([
        AbortSignal.timeout(15_000),
        ...(signal ? [signal] : []),
        ...(init?.signal ? [init.signal] : []),
      ]),
    }),
  });
}

export function normalizeEmbedding(values: number[] | undefined, dimensions: number): number[] {
  if (!values || values.length !== dimensions || values.some((value) => !Number.isFinite(value))) {
    throw new Error('Gemini returned an invalid embedding.');
  }
  const norm = Math.hypot(...values);
  if (!norm || !Number.isFinite(norm)) throw new Error('Gemini returned an invalid embedding magnitude.');
  return values.map((value) => value / norm);
}

export async function embed(ai: GoogleGenAI, config: Config, text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY', signal?: AbortSignal): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: config.GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: config.EMBEDDING_DIMENSIONS,
      ...(taskType === 'RETRIEVAL_DOCUMENT' ? { title: 'Joi Emmanuel Holgado resume' } : {}),
      abortSignal: signal,
    },
  });
  return normalizeEmbedding(response.embeddings?.[0]?.values, config.EMBEDDING_DIMENSIONS);
}
