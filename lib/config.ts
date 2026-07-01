// Central config. Both providers are OpenAI-compatible, so the whole app talks to
// them through the one `openai` SDK — only the base URL and model string change.

// --- Generation: OpenRouter (free tier, no credit card) --------------------
/** OpenAI-compatible base URL for OpenRouter. Uses OPENROUTER_API_KEY. */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/**
 * Generation model. Must be a **free** OpenRouter model (the `:free` suffix).
 * Swap the string, nothing else changes:
 *   - "nousresearch/hermes-3-llama-3.1-405b:free" (default) — Nous Hermes, 131K ctx
 *   - "meta-llama/llama-3.3-70b-instruct:free"              — Llama 3.3
 * Free models are rate-limited (~20 req/min, ~200 req/day) and IDs rotate —
 * see https://openrouter.ai/collections/free-models if one 404s.
 */
export const GEN_MODEL = "nousresearch/hermes-3-llama-3.1-405b:free";

// --- Embeddings: Google Gemini (free tier, no credit card) ------------------
// OpenRouter/Nous embeddings cost credits; Anthropic has no embeddings endpoint.
// Gemini's free tier exposes an OpenAI-compatible embeddings endpoint.
/** OpenAI-compatible base URL for the Gemini API. Uses GEMINI_API_KEY. */
export const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
/** Gemini embedding model (default 3072-dim; retrieval is dimension-agnostic). */
export const EMBED_MODEL = "gemini-embedding-001";

// --- Retrieval + limits -----------------------------------------------------
/** How many chunks to retrieve and ground the answer in. */
export const TOP_K = 5;

/** Guard at the API boundary. */
export const MAX_QUESTION_LEN = 1000;

/** Answer length cap. */
export const MAX_ANSWER_TOKENS = 1024;

/** Chunking parameters used by scripts/ingest.ts. */
export const CHUNK_TOKENS = 600;
export const CHUNK_OVERLAP_TOKENS = 80;
