import OpenAI from "openai";
import { GEN_MODEL, MAX_ANSWER_TOKENS, OPENROUTER_BASE_URL } from "./config";
import type { Retrieved, CitationRef } from "./types";

// Generation runs on a free OpenRouter model via its OpenAI-compatible API.
// Lazily constructed so importing this module (e.g. during `next build`) doesn't throw
// when OPENROUTER_API_KEY is unset — the key is only needed when a request runs.
// Server-only. Reads OPENROUTER_API_KEY from the environment.
let _client: OpenAI | null = null;
function client(): OpenAI {
  return (_client ??= new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey: process.env.OPENROUTER_API_KEY,
    // Optional attribution headers OpenRouter uses for its rankings.
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/NDilanka/docs-chat",
      "X-Title": "Tessera docs-chat",
    },
  }));
}

// The corpus has no native Citations (that's an Anthropic-only API feature), so we
// ground the model on numbered sources and ask it to cite inline with [n] markers,
// then map those markers back to their source below. This keeps the demo model-agnostic.
const SYSTEM = `You are a documentation assistant. Answer the user's question using ONLY the numbered sources provided.

Rules:
- If the answer is not in the sources, say you don't know based on the provided documents. Do not invent an answer.
- Be concise and answer directly, with no preamble (do not start with "Based on..." or "According to...").
- Cite every factual claim inline using the source number in square brackets, e.g. [1] or [3].
- Use a separate bracket per source ([1][2], never [1, 2]). Only cite sources that directly support the claim.`;

/** A high-level answer event. The route maps these 1:1 onto the NDJSON wire protocol. */
export type AnswerEvent =
  | { type: "text"; text: string }
  | { type: "citation"; citation: CitationRef };

/**
 * Stream a grounded answer from a free OpenRouter model.
 * Retrieved chunks are passed as numbered sources; the model cites them inline as [n],
 * and we surface each referenced source once as a CitationRef (documentIndex = n - 1).
 */
export async function* streamAnswer(
  question: string,
  retrieved: Retrieved[],
): AsyncGenerator<AnswerEvent> {
  const sources = retrieved
    .map((r, i) => `[${i + 1}] ${r.source}\n${r.text}`)
    .join("\n\n");

  const stream = await client().chat.completions.create({
    model: GEN_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Sources:\n${sources}\n\nQuestion: ${question}` },
    ],
  });

  let acc = "";
  const emitted = new Set<number>();
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content ?? "";
    if (!delta) continue;
    acc += delta;
    yield { type: "text", text: delta };

    // Surface each newly-completed [n] marker as a citation chip (deduped by source).
    for (const m of acc.matchAll(/\[(\d+)\]/g)) {
      const di = Number(m[1]) - 1;
      if (di >= 0 && di < retrieved.length && !emitted.has(di)) {
        emitted.add(di);
        const r = retrieved[di];
        yield {
          type: "citation",
          citation: {
            citedText: r.text.slice(0, 240),
            documentIndex: di,
            source: r.source,
            url: r.url,
          },
        };
      }
    }
  }
}
