# Case Study — Grounded "Chat with your docs" (Next.js · free-tier RAG)

**One-liner:** A production-style RAG feature that lets users ask
natural-language questions over a document set and get streaming answers with
verifiable, **clickable source citations** — dropped in as a single React
component inside an existing Next.js app, deployed serverless on Vercel.

---

## Problem

Most "AI chat" features bolted onto products are thin ChatGPT wrappers: they
hallucinate, they can't show *where* an answer came from, and they're built as
standalone apps rather than features that live inside the product. For any team
with real documentation — a help center, a handbook, API docs — that's a
non-starter. Users (and buyers) need to **trust** the answer, and the feature
has to fit the **existing React/Next codebase**, not replace it.

## Approach

I built a grounded Retrieval-Augmented Generation pipeline where the chat is one
self-contained component on an otherwise ordinary Next.js 16 page:

- **Ingest & chunk.** The corpus is loaded and split into ~600-token chunks with
  80-token overlap, preserving each chunk's source title, URL, and heading path.
- **Embed once.** Chunks are embedded with Google Gemini (`gemini-embedding-001`,
  free tier) at build time into a small JSON index — no vector database, no extra services.
- **Retrieve.** Each question is embedded and scored against the index with a
  cosine top-k scan (sub-millisecond for a bounded corpus) inside a Next.js
  Route Handler.
- **Ground & generate.** The retrieved chunks are passed to a free OpenRouter
  model (Nous Hermes) as **numbered sources**, and the model cites each claim
  inline with `[n]` markers. The route maps every `[n]` back to its source chunk,
  so grounding is **model-agnostic** — it works with any OpenAI-compatible model
  rather than one vendor's built-in citation feature.
- **Stream & cite.** The route streams NDJSON (sources → text tokens →
  citations → done) to the browser. The UI renders tokens live and turns each
  citation into a numbered chip; clicking a chip scrolls to and highlights the
  source passage.

The whole thing is architected around two swap-points — the **corpus seam**
(`docs/` + the ingest script) and the **store seam** (`lib/retrieval.ts`) — so
it re-targets to a new client by swapping content and, if needed, the vector
store, with the route handler and UI untouched.

## Result

- A trustworthy, on-brand assistant: **every claim links back to its exact
  source**, and out-of-scope questions get an honest "that's not in these docs"
  instead of a confident hallucination.
- **Streaming** responses that feel like a real product, not a form submission.
- A **drop-in feature** — visibly a panel inside a normal Next.js page — that
  deploys to Vercel's free tier with two free-tier keys and runs at **$0, no
  credit card** (free OpenRouter model + Gemini free embeddings).
- A reusable template: the same repo becomes the starting point for paying
  engagements, where only the corpus and (optionally) the vector store change.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · OpenRouter (free-tier
generation, Nous Hermes) · Google Gemini (embeddings) · the `openai` SDK · plain
CSS modules · Vercel.
