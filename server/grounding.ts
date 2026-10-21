import { z } from 'zod';

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4000),
  }).strict()).max(6).default([]),
}).strict();

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const selectionSchema = z.object({
  supported: z.boolean(),
  paragraphs: z.array(z.object({
    text: z.string().trim().min(1).max(800),
    evidence: z.array(z.object({
      evidenceId: z.string().min(1),
      quote: z.string().trim().min(1).max(360),
    }).strict()).min(1).max(6),
  }).strict()).max(4),
}).strict();

export interface ChatResponse {
  answer: string;
  status: 'answered' | 'insufficient_evidence';
  sources: EvidencePassage[];
}

export interface EvidencePassage {
  id: string;
  text: string;
}

export interface VectorMatch {
  id: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export function refusal(): ChatResponse {
  return {
    answer: "I couldn't find that in Joi's portfolio. I'm happy to help with questions about his experience, skills, or education, or you can contact him directly for more details.",
    status: 'insufficient_evidence',
    sources: [],
  };
}

/** Keep bounded passage text from the configured index; metadata is never instructions. */
export function retrievedPassages(matches: VectorMatch[], minimumScore: number): EvidencePassage[] {
  const seen = new Set<string>();
  const seenText = new Set<string>();
  return matches.flatMap((match) => {
    const text = match.metadata?.text;
    if (typeof match.id !== 'string' || !match.id.trim() || seen.has(match.id)
      || !Number.isFinite(match.score) || match.score! < minimumScore || match.score! > 1
      || typeof text !== 'string' || !text.trim() || text.length > 12000 || seenText.has(text.trim())) return [];
    seen.add(match.id);
    seenText.add(text.trim());
    return [{ id: match.id, text: text.trim() }];
  }).slice(0, 6);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/** Match complete words in evidence quotes, so Java cannot be extracted from JavaScript. */
function containsExcerpt(source: string, excerpt: string): boolean {
  const wordCharacter = /[\p{L}\p{N}_]/u;
  let start = source.indexOf(excerpt);
  while (start !== -1) {
    const end = start + excerpt.length;
    const joinsPreviousWord = wordCharacter.test(excerpt[0]) && wordCharacter.test(source[start - 1] ?? '');
    const joinsNextWord = wordCharacter.test(excerpt.at(-1)!) && wordCharacter.test(source[end] ?? '');
    if (!joinsPreviousWord && !joinsNextWord) return true;
    start = source.indexOf(excerpt, start + 1);
  }
  return false;
}

/** Validate cited evidence before returning prose; claim faithfulness still depends on the model. */
export function groundSelection(raw: string, candidates: EvidencePassage[]): ChatResponse {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return refusal(); }
  const result = selectionSchema.safeParse(parsed);
  if (!result.success || !result.data.supported || !result.data.paragraphs.length) return refusal();
  const lookup = new Map(candidates.map((passage) => [passage.id, passage]));
  const sourceIds = new Set<string>();
  // Validate all anchors before deduplication, including repeated references.
  for (const paragraph of result.data.paragraphs) {
    // Citation numbers belong to the server, never the model.
    if (/\[\d+\]/u.test(paragraph.text)) return refusal();
    for (const evidence of paragraph.evidence) {
      const passage = lookup.get(evidence.evidenceId);
      if (!passage || !containsExcerpt(normalizeWhitespace(passage.text), normalizeWhitespace(evidence.quote))) return refusal();
      sourceIds.add(evidence.evidenceId);
    }
  }
  if (sourceIds.size > 3) return refusal();
  const sources: EvidencePassage[] = [];
  const citations = new Map<string, number>();
  const paragraphs = result.data.paragraphs.map((paragraph) => {
    const paragraphCitations = new Set<number>();
    for (const evidence of paragraph.evidence) {
      let citation = citations.get(evidence.evidenceId);
      if (citation === undefined) {
        const passage = lookup.get(evidence.evidenceId)!;
        sources.push({ id: passage.id, text: passage.text });
        citation = sources.length;
        citations.set(evidence.evidenceId, citation);
      }
      paragraphCitations.add(citation);
    }
    return `${normalizeWhitespace(paragraph.text)} ${[...paragraphCitations].map((citation) => `[${citation}]`).join(' ')}`;
  });
  return {
    answer: paragraphs.join('\n\n'),
    status: 'answered',
    sources,
  };
}
