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

// --- Generation fallback: Gemini free tier ----------------------------------
/**
 * Free-tier generation model, used when OPENROUTER_API_KEY is absent so the app
 * still answers at $0 (no credit card). Served through Gemini's OpenAI-compatible
 * endpoint (GEMINI_BASE_URL below) with GEMINI_API_KEY. Streaming and the
 * max_tokens cap both work over the compat layer. We use the `-latest` alias
 * because the pinned `gemini-2.5-flash-lite` id currently 404s on the compat
 * chat endpoint; `gemini-flash-lite-latest` always resolves to the current
 * free flash-lite model. Free-tier limits are ~15 RPM / ~1,000 RPD.
 */
export const GEN_MODEL_FREE = "gemini-flash-lite-latest";

/** Resolved generation provider (base URL + which key env to use + model). */
export interface GenProvider {
  baseURL: string;
  apiKey: string | undefined;
  model: string;
}

/**
 * Pick the generation provider from the environment (evaluated per call, so it
 * reflects runtime env, not build-time). Preference order:
 *   1. OPENROUTER_API_KEY set → OpenRouter + Claude Haiku 4.5 (the paid default).
 *   2. else GEMINI_API_KEY set → Gemini free tier + gemini-flash-lite-latest.
 *   3. neither → OpenRouter shape with an undefined key, preserving the existing
 *      "missing key" error path unchanged.
 * Embeddings are untouched — they always use Gemini regardless of this choice.
 */
export function resolveGenProvider(): GenProvider {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      baseURL: OPENROUTER_BASE_URL,
      apiKey: process.env.OPENROUTER_API_KEY,
      model: GEN_MODEL,
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      baseURL: GEMINI_BASE_URL,
      apiKey: process.env.GEMINI_API_KEY,
      model: GEN_MODEL_FREE,
    };
  }
  return { baseURL: OPENROUTER_BASE_URL, apiKey: undefined, model: GEN_MODEL };
}

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
