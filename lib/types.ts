// Shared contracts for the docs-chat RAG demo.
// Both the ingestion script and the runtime route build against these.

/** One retrievable passage, before embedding. Produced by scripts/ingest.ts. */
export interface Chunk {
  id: string;
  /** Human-readable document title / file name, shown in citation chips. */
  source: string;
  /** Optional source URL the citation chip links to. */
  url?: string;
  /** Optional breadcrumb of headings the chunk lives under (e.g. "Billing > Refunds"). */
  headingPath?: string;
  /** The chunk text. This exact string is what the model cites char offsets into. */
  text: string;
}

/** A chunk plus its embedding vector. This is the shape stored in data/index.json. */
export interface IndexEntry extends Chunk {
  embedding: number[];
}

/** A retrieved chunk with its similarity score. Returned by cosineTopK. */
export interface Retrieved extends IndexEntry {
  score: number;
}

// ---------------------------------------------------------------------------
// Streaming protocol: POST /api/chat returns newline-delimited JSON (NDJSON).
// Each line is one StreamEvent. The browser parses line-by-line.
// ---------------------------------------------------------------------------

/** A retrieved source, sent once up front so the UI can render a sources panel. */
export interface SourceRef {
  index: number;
  source: string;
  url?: string;
  headingPath?: string;
  text: string;
}

/** A citation attached to the answer, mapped from the model's document_index. */
export interface CitationRef {
  citedText: string;
  documentIndex: number;
  source: string;
  url?: string;
}

export type StreamEvent =
  | { type: "sources"; sources: SourceRef[] } // always first
  | { type: "text"; text: string } // a streamed answer token/segment
  | { type: "citation"; citation: CitationRef } // a grounded citation
  | { type: "done" }
  | { type: "error"; message: string };

/** Request body for POST /api/chat. */
export interface ChatRequest {
  question: string;
  /**
   * Cloudflare Turnstile token. Only required when TURNSTILE_SECRET_KEY is set
   * on the server (and NEXT_PUBLIC_TURNSTILE_SITE_KEY on the client); omitted
   * entirely when Turnstile is disabled.
   */
  turnstileToken?: string;
}
