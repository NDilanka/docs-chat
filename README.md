# Chat with your docs — grounded RAG demo

A production-style **"chat with your docs"** feature, built as a single React
component dropped into an otherwise ordinary **Next.js 15 (App Router)** app.
Ask a natural-language question, watch the answer **stream in live**, and click
any **citation** to jump to the exact source passage it came from. Questions
outside the documents are answered honestly — *no hallucinations.*

This is the point of the demo: it isn't a standalone chatbot, it's a feature you
drop into an existing React/Next app. Swap the corpus, re-skin, ship.

- **Grounded** — answers come only from the indexed docs.
- **Cited** — Anthropic's native Citations link every claim to its source span.
- **Streaming** — tokens render as they're generated.
- **Serverless** — no vector DB, no Docker; one `next dev` process, a free Vercel deploy.

---

## Architecture

The corpus is embedded **once at build time** into a small JSON index. At
runtime each question is a single embed + a single cosine scan + one grounded
generation — all inside one Next.js Route Handler.

```
BUILD-TIME (run once, offline) — scripts/ingest.ts
  docs/*.md  →  chunk (~600 tok, 80 overlap)  →  embed (OpenAI)  →  data/index.json

RUNTIME (per question) — app/api/chat/route.ts
  Browser <Chat/>  ── POST /api/chat { question } ──▶  Route Handler
     1. embed(question)            → OpenAI text-embedding-3-small
     2. cosineTopK(qVec, index, 5) → top-k chunks + their source/url
     3. Claude (native citations)  → chunks passed as `document` blocks
     4. stream NDJSON back         → text + citation events
  Browser renders streaming tokens + citation chips → click = scroll to source
```

### Runtime pipeline

`ingest → chunk → embed (OpenAI) → retrieve (cosine top-k) → ground + generate
(Claude with native citations) → stream → cite.`

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
| `lib/retrieval.ts` | `embedQuery()` + `cosineTopK()` (**store seam** — swap here) |
| `lib/config.ts` | model + chunking + top-k constants |
| `lib/types.ts` | shared contracts incl. the streaming protocol |
| `app/api/chat/route.ts` | validate → retrieve → stream Claude with citations |
| `app/page.tsx` | the product page shell |
| `components/Chat.tsx` | the streaming chat UI + citation chips |

---

## Setup

Prerequisites: **Node 18.18+** and the two API keys below.

```bash
# 1. Configure secrets
cp .env.example .env.local
#    then open .env.local and fill in:
#      ANTHROPIC_API_KEY=...
#      OPENAI_API_KEY=...

# 2. Install
npm install

# 3. Build the search index (one-time; embeds the corpus into data/index.json)
npm run ingest

# 4. Run
npm run dev
#    → http://localhost:3000
```

Useful scripts: `npm run typecheck`, `npm run test:retrieval`, `npm run build`.

### The two API keys

This demo needs **two** keys, and they're separate things:

- **`ANTHROPIC_API_KEY`** — powers the *deployed app's* answer generation. This
  is a **pay-as-you-go** key from the Anthropic Console and is **billed
  separately from a Claude Max subscription**. Claude Max powers Claude Code
  (which *builds* the app); the running demo's API calls need their own key with
  its own (tiny) balance. Budget for cents, but don't expect Claude Max to cover it.
- **`OPENAI_API_KEY`** — used **only for embeddings**
  (`text-embedding-3-small`). Anthropic has no embeddings endpoint, so a small
  OpenAI key handles the vectors. Ingestion embeds the whole corpus once for a
  fraction of a cent; each question is one tiny query embedding.

Both keys are **server-only** environment variables — never shipped to the
client, never logged, and `.env.local` is git-ignored.

### Swap the model in one line

The generation model lives in a single constant — `lib/config.ts`:

```ts
export const GEN_MODEL = "claude-opus-4-8"; // default: most capable
// swap to:
//   "claude-sonnet-4-6"  — faster / cheaper, great for grounded Q&A
//   "claude-haiku-4-5"   — cheapest, fine for short factual answers
```

Change the string, nothing else — the route handler and UI are untouched.

---

## Deploy to Vercel

1. **Push** this repo to GitHub. (`data/index.json` is committed, so the deploy
   needs no build-time embedding.)
2. **Import** the repo at [vercel.com/new](https://vercel.com/new).
3. **Set the two env vars** — `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` — in
   *Project → Settings → Environment Variables*.
4. Deploy. You get a live URL where a stranger can ask a question and watch a
   grounded, cited answer stream in.

---

## Reuse it as a client template

The architecture isolates everything client-specific behind **two seams** — so
each new engagement starts from a working, deployed baseline:

1. **Corpus seam — `docs/` + `scripts/ingest.ts`.** Drop in the client's
   content (help center, PDFs, a Notion/Drive export, a crawl) and re-run
   `npm run ingest`. Nothing else changes.
2. **Store seam — `lib/retrieval.ts`.** It exposes `embedQuery()` + `cosineTopK()`.
   For a large or growing corpus, replace the in-memory cosine scan with a
   hosted vector store (e.g. Convex vector search or Upstash Vector) behind the
   **same function signature** — the route handler and UI never know.

Everything else — the streaming route, the `document`-blocks-with-citations
grounding, the chat UI, the citation rendering — ships unchanged.

---

## Tech

Next.js 15 (App Router) · React · TypeScript · Anthropic Claude (native
Citations) · OpenAI embeddings · plain CSS modules · Vercel.
