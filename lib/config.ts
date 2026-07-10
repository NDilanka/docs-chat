// Central config. Both providers are OpenAI-compatible, so the whole app talks to
// them through the one `openai` SDK — only the base URL and model string change.

// --- Generation: OpenRouter → Claude Haiku 4.5 ------------------------------
/** OpenAI-compatible base URL for OpenRouter. Uses OPENROUTER_API_KEY. */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/**
 * Generation model: Anthropic's Claude Haiku 4.5, served through OpenRouter's
 * OpenAI-compatible endpoint. This is a **paid** model (~$1 / $5 per million
 * input / output tokens), so the OpenRouter key needs a few dollars of credit —
 * at demo traffic a full grounded answer costs a fraction of a cent.
 *
 * Because everything speaks the OpenAI wire format, swapping providers or models
 * stays a one-line change: point GEN_MODEL (and OPENROUTER_BASE_URL, if needed)
 * at any OpenAI-compatible endpoint — another OpenRouter model, a native
 * Anthropic/OpenAI base URL, or a self-hosted gateway — and nothing else changes.
 */
export const GEN_MODEL = "anthropic/claude-haiku-4.5";

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
