// Central config. Swapping the generation model is a one-line change here.

/**
 * Generation model. Default is the most capable Opus tier.
 * Cost/latency levers (swap the string, nothing else changes):
 *   - "claude-sonnet-4-6"  ($3 / $15 per 1M tok) — faster, cheaper, great for grounded Q&A
 *   - "claude-haiku-4-5"   ($1 / $5  per 1M tok) — cheapest, fine for short factual answers
 */
export const GEN_MODEL = "claude-opus-4-8";

/** OpenAI embedding model (1536-dim, cheap, hosted). */
export const EMBED_MODEL = "text-embedding-3-small";

/** How many chunks to retrieve and ground the answer in. */
export const TOP_K = 5;

/** Guard at the API boundary. */
export const MAX_QUESTION_LEN = 1000;

/** Answer length cap. */
export const MAX_ANSWER_TOKENS = 1024;

/** Chunking parameters used by scripts/ingest.ts. */
export const CHUNK_TOKENS = 600;
export const CHUNK_OVERLAP_TOKENS = 80;
