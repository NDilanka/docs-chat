# Engineering decisions

Short log of the load-bearing tradeoffs in this demo, and where each one would
change under real production load. The theme throughout: this is a portfolio
demo of a *feature you drop into an app*, so the calls favor a tiny, legible,
zero-infra baseline with clearly marked seams — not the biggest hammer.

---

## 1. In-memory cosine search over a committed `index.json`

**Decision.** Retrieval is a linear cosine scan (`lib/retrieval.ts → cosineTopK`)
over an `index.json` that's built once at ingest time and committed to the repo.
No vector database, no external service, no build-time embedding on deploy.

**Why.** The corpus is 22 docs → a few hundred chunks. A full scan is
sub-millisecond and the whole index is a small JSON file, so the "database" is
just a file read cached in module scope. That removes an entire class of infra
(provisioning, connection strings, migrations, a second thing that can be down)
from a demo whose point is the *feature*, not the plumbing. Committing the index
also means the Vercel deploy needs no embedding step and no build-time API key.

**When I'd do it differently.** Once the corpus outgrows memory or needs live
updates — roughly low-thousands of chunks, or content that changes often enough
that re-committing an index is annoying — I'd move behind the same
`cosineTopK(query, index, k)` signature to a hosted vector store (pgvector on
Postgres, Pinecone, or Upstash Vector). The route handler and UI never see the
difference; only `lib/retrieval.ts` changes. That function is deliberately the
"store seam."

---

## 2. Claude Haiku via OpenRouter, not the native Anthropic SDK

**Decision.** Generation goes through OpenRouter's OpenAI-compatible endpoint
(`anthropic/claude-haiku-4.5`) using the `openai` SDK with a swapped base URL —
the same SDK that talks to Gemini for embeddings.

**Why.** One SDK, one wire format, for both providers. Switching model or
provider is a one-line change in `lib/config.ts` (`GEN_MODEL` / base URL), which
is exactly the flexibility a client demo wants to show. OpenRouter also gives a
single key and a single credit cap that backstops abuse (see #4).

**When I'd do it differently.** For a production Anthropic deployment I'd rewrite
`lib/generation.ts` against the native Anthropic SDK (`@anthropic-ai/sdk`). That
buys richer streaming events, prompt caching on the grounding context (a big cost
win when the same system prompt + sources recur), and native Citations (see #3).
It's ~half a day of work isolated to `generation.ts` — the streaming protocol and
UI are unaffected — but it trades away the model-agnostic, swap-in-one-line
property, so it's a deliberate "we've committed to Anthropic" move.

---

## 3. Manual `[n]` citation mapping, not provider-native citations

**Decision.** The model is grounded on numbered sources and asked to cite inline
with `[n]` markers; the route parses those markers back to source chunks and
emits citation events (`lib/generation.ts`).

**Why.** Native citations (Anthropic's Citations API) are provider-specific. A
manual `[n]` convention works with *any* OpenAI-compatible model, which keeps the
demo swappable (see #2) and keeps the citation UX identical regardless of what's
behind `GEN_MODEL`. The mapping is a dozen lines of regex + dedupe.

**When I'd do it differently.** If pinned to a provider with first-class
citations, I'd use them: they give exact character spans instead of
model-emitted markers, so citations can't drift or hallucinate a number, and I'd
drop the manual parsing. The cost is the same as #2 — it's model-specific — so
the two decisions move together.

---

## 4. In-memory best-effort rate limiting + provider credit cap

**Decision.** Abuse guards (`lib/guards.ts`) are module-scope Maps: a per-IP
sliding window (6 req/min) and a global daily cap (200 req/UTC-day), plus
env-gated Cloudflare Turnstile. The honest backstop is the OpenRouter key's
credit cap.

**Why.** For a public demo the goal is "don't let a stranger or a runaway loop
run up the bill," not "enforce a global quota to the request." In-memory limiters
need zero infra and handle the common cases. Crucially the code says out loud
what they *don't* do: on serverless each instance has its own Maps, so the limits
are per-instance best-effort. The real guarantee is financial — a key funded with
a few dollars physically can't spend more.

**When I'd do it differently.** Anything where the limit must actually hold
across instances — real multi-tenant traffic, or a limit tied to correctness
rather than cost — needs shared state: Redis / Upstash with a sliding-window or
token-bucket algorithm keyed by IP or user. Same call sites in the route; the
Maps in `guards.ts` become client calls.

---

## 5. NDJSON over `fetch`, not SSE or WebSockets

**Decision.** `POST /api/chat` streams newline-delimited JSON; the browser reads
the `fetch` response body with a `ReadableStream` reader and parses line by line
(`components/Chat.tsx`).

**Why.** The interaction is a single request → one streamed response, then done.
NDJSON over a plain POST fits that exactly: it's one round trip, works through the
Next.js route handler with no extra endpoint or server, and carries mixed event
types (`sources`, `text`, `citation`, `done`, `error`) as one object per line.
`EventSource`/SSE can't do a POST body cleanly and WebSockets add a stateful
connection and its own lifecycle for no benefit here.

**When I'd do it differently.** SSE becomes worth it if I want the browser's
built-in auto-reconnect and `Last-Event-ID` resumption for long-lived streams.
WebSockets earn their keep only with genuine bidirectional needs — collaborative
editing, presence, server-initiated pushes — none of which a one-shot Q&A has.
