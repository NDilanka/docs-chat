import Anthropic from "@anthropic-ai/sdk";
import { GEN_MODEL, MAX_ANSWER_TOKENS } from "./config";
import type { Retrieved } from "./types";

// Lazily constructed so importing this module (e.g. during `next build`) doesn't throw
// when ANTHROPIC_API_KEY is unset — the key is only needed when a request actually runs.
// Server-only. Reads ANTHROPIC_API_KEY from the environment.
let _client: Anthropic | null = null;
function client(): Anthropic {
  return (_client ??= new Anthropic());
}

const SYSTEM = `You are a documentation assistant. Answer the user's question using ONLY the provided documents.

Rules:
- If the answer is not contained in the documents, say you don't know based on the provided documents. Do not invent an answer.
- Be concise and answer directly, with no preamble (do not start with "Based on..." or "According to...").
- Ground every factual claim in the documents and cite the documents you use.`;

/**
 * Stream a grounded answer. Each retrieved chunk is passed as a `document` content block
 * with native Citations enabled, so the model returns verifiable `cited_text` spans tied to
 * a `document_index` (which maps 1:1 to the `retrieved` array order). No beta header needed.
 */
export function streamAnswer(question: string, retrieved: Retrieved[]) {
  const documents = retrieved.map((r) => ({
    type: "document" as const,
    source: {
      type: "text" as const,
      media_type: "text/plain" as const,
      data: r.text,
    },
    title: r.source,
    citations: { enabled: true },
  }));

  return client().messages.stream({
    model: GEN_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [...documents, { type: "text" as const, text: question }],
      },
    ],
  });
}
