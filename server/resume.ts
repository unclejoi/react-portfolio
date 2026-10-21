import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PDFParse } from 'pdf-parse';

export const RESUME_URL = '/assets/joi-emmanuel-holgado-resume.pdf';
export const CHUNK_VERSION = 'page-lines-v1';

export interface ResumeChunk {
  id: string;
  page: number;
  text: string;
}

export interface ResumeDocument {
  hash: string;
  chunks: ResumeChunk[];
}

/** Keep page boundaries and complete extracted lines with a small overlap. */
export function chunkPages(pages: { num: number; text: string }[], hash: string): ResumeChunk[] {
  const chunks: ResumeChunk[] = [];
  for (const page of pages) {
    const lines = page.text.replace(/\r\n?/g, '\n').split('\n')
      .map((line) => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean);
    let buffer: string[] = [];
    const flush = () => {
      if (!buffer.length) return;
      chunks.push({ id: `${hash.slice(0, 20)}-p${page.num}-${chunks.length}`, page: page.num, text: buffer.join('\n') });
      buffer = [];
    };
    for (const line of lines) {
      // Include a small, complete-line overlap for role headings near boundaries.
      if (buffer.join('\n').length + line.length > 1100 && buffer.length > 2) {
        const overlap = buffer.slice(-2);
        flush();
        buffer = overlap;
      }
      buffer.push(line);
    }
    flush();
  }
  return chunks;
}

export async function loadResume(path = resolve(process.cwd(), 'public', RESUME_URL.slice(1))): Promise<ResumeDocument> {
  const bytes = await readFile(path);
  const hash = createHash('sha256').update(bytes).digest('hex');
  // Copy into a plain Uint8Array for PDF.js workers on Windows/Node 24.
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const result = await parser.getText();
    const chunks = chunkPages(result.pages, hash);
    if (!chunks.length || chunks.reduce((total, chunk) => total + chunk.text.length, 0) < 100) {
      throw new Error('The resume has no extractable text. Use a text-based PDF or OCR it before indexing.');
    }
    return { hash, chunks };
  } finally {
    await parser.destroy();
  }
}

export function documentVersion(document: ResumeDocument, model: string, dimensions: number): string {
  return createHash('sha256').update(`${document.hash}:${model}:${dimensions}:${CHUNK_VERSION}`).digest('hex');
}

export function resumeNamespace(prefix: string, version: string): string {
  return `${prefix}-${version}`;
}
