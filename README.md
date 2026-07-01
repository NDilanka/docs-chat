# Chat with your docs — grounded RAG demo

A production-style **"chat with your docs"** feature, built as a single React
component dropped into an otherwise ordinary **Next.js 16 (App Router)** app.
Ask a natural-language question, watch the answer **stream in live**, and click
any **citation** to jump to the exact source passage it came from. Questions
outside the documents are answered honestly — *no hallucinations.*

This is the point of the demo: it isn't a standalone chatbot, it's a feature you
drop into an existing React/Next app. Swap the corpus, re-skin, ship.

- **Grounded** — answers come only from the indexed docs.
- **Cited** — every claim links to the source chunk it came from (click to jump).
- **Streaming** — tokens render as they're generated.
- **Free to run** — generation and embeddings both use **free-tier APIs, no credit card**.
- **Serverless** — no vector DB, no Docker; one `next dev` process, a free Vercel deploy.

---

## Architecture

The corpus is embedded **once at build time** into a small JSON index. At
runtime each question is a single embed + a single cosine scan + one grounded
generation — all inside one Next.js Route Handler.

```
BUILD-TIME (run once, offline) — scripts/ingest.ts
  docs/*.md  →  chunk (~600 tok, 80 overlap)  →  embed (Gemini)  →  data/index.json

RUNTIME (per question) — app/api/chat/route.ts
  Browser <Chat/>  ── POST /api/chat { question } ──▶  Route Handler
     1. embed(question)            → Gemini text embeddings
     2. cosineTopK(qVec, index, 5) → top-k chunks + their source/url
     3. generate (OpenRouter)      → chunks passed as numbered sources; model cites [n]
     4. stream NDJSON back         → text + citation events
  Browser renders streaming tokens + citation chips → click = scroll to source
```

Both providers speak the **OpenAI-compatible API**, so the whole app talks to
them through the one `openai` SDK — only the base URL and model string differ
(see `lib/config.ts`).

### Runtime pipeline

`ingest → chunk → embed (Gemini) → retrieve (cosine top-k) → ground + generate
(a free OpenRouter model, cited with [n] markers) → stream → cite.`

### Grounding + citations

There's no native-citations API here (that's Anthropic-specific), so the demo is
**model-agnostic**: retrieved chunks are passed to the model as **numbered
sources**, and the system prompt asks it to cite every claim inline with `[n]`
markers. The route maps each `[n]` back to its source chunk and emits a citation
event — so the UI still gets clickable chips that scroll to the exact passage,
with any OpenAI-compatible model.

### The streaming protocol

`POST /api/chat` with body `{ "question": string }` returns **newline-delimited
JSON (NDJSON)** — each line is one event (`lib/types.ts → StreamEvent`):

| event | payload | UI behavior |
|---|---|---|
| `sources` | `SourceRef[]` | arrives first — render the sources panel |
| `text` | `{ text }` | append for the live-typing effect |
| `citation` | `CitationRef` | render as a numbered, clickable chip |
| `done` | — | stream finished |
| `error` | `{ message }` | show an error toast |

The client buffers partial lines (split on `\n`, keep the trailing fragment),
`JSON.parse`s each complete line, and dispatches on `type`.

### Key files

| Path | Role |
|---|---|
| `docs/` | the corpus (**corpus seam** — swap here) |
| `scripts/ingest.ts` | load → chunk → embed → write `data/index.json` |
| `lib/retrieval.ts` | `cosineTopK()` (**store seam** — swap here) |
| `lib/embeddings.ts` | Gemini embeddings (`embedTexts` / `embedQuery`) |
| `lib/generation.ts` | stream a grounded answer + map `[n]` → citations |
| `lib/config.ts` | provider base URLs + model + chunking + top-k constants |
| `lib/types.ts` | shared contracts incl. the streaming protocol |
| `app/api/chat/route.ts` | validate → retrieve → stream the grounded answer |
| `app/page.tsx` | the product page shell |
| `components/Chat.tsx` | the streaming chat UI + citation chips |

---

## Setup

Prerequisites: **Node 20+** and the two **free** API keys below.

```bash
# 1. Configure secrets
cp .env.example .env.local
#    then open .env.local and fill in:
#      OPENROUTER_API_KEY=...
#      GEMINI_API_KEY=...

# 2. Install
npm install

# 3. Build the search index (one-time; embeds the corpus into data/index.json)
npm run ingest

# 4. Run
npm run dev
#    → http://localhost:3000
```

Useful scripts: `npm run typecheck`, `npm run test:retrieval`, `npm run build`.

### The two API keys (both free, no credit card)

This demo needs **two** keys, and they're separate things:

- **`OPENROUTER_API_KEY`** — powers answer generation. [OpenRouter](https://openrouter.ai)
  offers ~29 **free** models (the `:free` suffix); the default is
  `nousresearch/hermes-3-llama-3.1-405b:free`. No card required. Free models are
  rate-limited (~20 req/min, ~200 req/day) — plenty for a demo. Get a key at
  [openrouter.ai/keys](https://openrouter.ai/keys).
- **`GEMINI_API_KEY`** — used **only for embeddings** (`gemini-embedding-001`).
  Google's [AI Studio](https://aistudio.google.com/apikey) free tier exposes an
  OpenAI-compatible embeddings endpoint. No card required.

Both keys are **server-only** environment variables — never shipped to the
client, never logged, and `.env.local` is git-ignored.

### Swap the model in one line

The generation model lives in a single constant — `lib/config.ts`:

```ts
export const GEN_MODEL = "nousresearch/hermes-3-llama-3.1-405b:free"; // default: free Nous Hermes
// swap to any free OpenRouter model, e.g.:
//   "meta-llama/llama-3.3-70b-instruct:free"
// or a paid one (with credits) for higher quality / no rate limits.
```

Change the string, nothing else — the route handler and UI are untouched. Free
model IDs rotate; if one 404s, pick another at
[openrouter.ai/collections/free-models](https://openrouter.ai/collections/free-models).

---

## Deploy to Vercel

1. **Push** this repo to GitHub. (`data/index.json` is committed, so the deploy
   needs no build-time embedding.)
2. **Import** the repo at [vercel.com/new](https://vercel.com/new).
3. **Set the two env vars** — `OPENROUTER_API_KEY` and `GEMINI_API_KEY` — in
   *Project → Settings → Environment Variables*.
4. Deploy. You get a live URL where a stranger can ask a question and watch a
   grounded, cited answer stream in — running entirely on free-tier APIs.

---

## Reuse it as a client template

The architecture isolates everything client-specific behind **two seams** — so
each new engagement starts from a working, deployed baseline:

1. **Corpus seam — `docs/` + `scripts/ingest.ts`.** Drop in the client's
   content (help center, PDFs, a Notion/Drive export, a crawl) and re-run
   `npm run ingest`. Nothing else changes.
2. **Store seam — `lib/retrieval.ts`.** It exposes `cosineTopK()`. For a large
   or growing corpus, replace the in-memory cosine scan with a hosted vector
   store (e.g. Convex vector search or Upstash Vector) behind the **same
   function signature** — the route handler and UI never know.

Everything else — the streaming route, the numbered-sources grounding, the
citation mapping, the chat UI — ships unchanged. And because both providers are
OpenAI-compatible, swapping to a paid/higher-quality model (or a different
provider) is a base-URL + model-string change in `lib/config.ts`.

---

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · OpenRouter (free-tier
generation) · Google Gemini (embeddings) · the `openai` SDK · plain CSS modules
· Vercel.
