import OpenAI from "openai";
import { EMBED_MODEL, GEMINI_BASE_URL } from "./config";

// Embeddings come from Google Gemini's OpenAI-compatible endpoint (free tier).
// Lazily constructed so importing this module (e.g. during `next build`) doesn't throw
// when GEMINI_API_KEY is unset — the key is only needed when embeddings actually run.
// Server-only — never import into a client component.
let _gemini: OpenAI | null = null;
function gemini(): OpenAI {
  return (_gemini ??= new OpenAI({
    baseURL: GEMINI_BASE_URL,
    apiKey: process.env.GEMINI_API_KEY,
  }));
}

/** Embed many texts, batched to stay within free-tier request limits. Order is preserved. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 32;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await gemini().embeddings.create({ model: EMBED_MODEL, input: batch });
    for (const d of res.data) out.push(d.embedding);
  }
  return out;
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}
