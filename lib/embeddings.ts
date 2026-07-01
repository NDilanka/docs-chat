import OpenAI from "openai";
import { EMBED_MODEL } from "./config";

// Lazily constructed so importing this module (e.g. during `next build`) doesn't throw
// when OPENAI_API_KEY is unset — the key is only needed when embeddings actually run.
// Server-only — never import into a client component.
let _openai: OpenAI | null = null;
function openai(): OpenAI {
  return (_openai ??= new OpenAI());
}

/** Embed many texts, batched to stay under request limits. Order is preserved. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH = 100;
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await openai().embeddings.create({ model: EMBED_MODEL, input: batch });
    for (const d of res.data) out.push(d.embedding);
  }
  return out;
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}
