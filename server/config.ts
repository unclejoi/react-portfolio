import 'dotenv/config';
import { z } from 'zod';

const indexNameHelp = 'Use the Pinecone index name (for example portfolio-resume), not its host URL; use 1-45 lowercase letters, digits, or hyphens, starting and ending with a letter or digit.';

const configuration = z.object({
  GEMINI_API_KEY: z.string().trim().default(''),
  PINECONE_API_KEY: z.string().trim().default(''),
  PINECONE_INDEX: z.string().trim().min(1, indexNameHelp).max(45, indexNameHelp)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, indexNameHelp).default('portfolio'),
  // Use the populated namespace exactly; an empty string also targets the default namespace.
  PINECONE_NAMESPACE: z.string().trim().default('__default__'),
  PINECONE_CLOUD: z.enum(['aws', 'gcp', 'azure']).default('aws'),
  PINECONE_REGION: z.string().trim().min(1).default('us-east-1'),
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.5-flash-lite'),
  // Fixed task types below are specific to this embedding model.
  GEMINI_EMBEDDING_MODEL: z.literal('gemini-embedding-001').default('gemini-embedding-001'),
  EMBEDDING_DIMENSIONS: z.coerce.number().pipe(z.union([z.literal(768), z.literal(1536), z.literal(3072)])).default(3072),
  RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.5),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().trim().min(1),
  // Set an exact hop count only when a trusted reverse proxy fronts Node.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type Config = z.infer<typeof configuration>;

export function loadConfig(options: { production?: boolean } = {}): Config {
  const production = options.production ?? (process.env.NODE_ENV === 'production');
  const result = configuration.safeParse({
    ...process.env,
    // Hosted services need a public listener; local development stays on loopback.
    HOST: process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'),
  });
  if (!result.success) {
    // Report field names, never credential values.
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    const help = fields.includes('PINECONE_INDEX') ? `. ${indexNameHelp}` : '';
    throw new Error(`Invalid server settings: ${fields.join(', ')}${help}`);
  }
  return result.data;
}

export function isConfigured(config: Config): boolean {
  return Boolean(config.GEMINI_API_KEY && config.PINECONE_API_KEY);
}
