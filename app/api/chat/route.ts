import { promises as fs } from "fs";
import path from "path";
import { embedQuery } from "@/lib/embeddings";
import { cosineTopK } from "@/lib/retrieval";
import { streamAnswer } from "@/lib/generation";
import { runGuards } from "@/lib/guards";
import { TOP_K, MAX_QUESTION_LEN } from "@/lib/config";
import type { IndexEntry, StreamEvent, SourceRef, ChatRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache the index in module scope so it's read + parsed once per server process.
let indexCache: IndexEntry[] | null = null;
async function loadIndex(): Promise<IndexEntry[]> {
  if (indexCache) return indexCache;
  const p = path.join(process.cwd(), "data", "index.json");
  const raw = await fs.readFile(p, "utf-8");
  indexCache = JSON.parse(raw) as IndexEntry[];
  return indexCache;
}

const enc = new TextEncoder();
function line(ev: StreamEvent): Uint8Array {
  return enc.encode(JSON.stringify(ev) + "\n");
}

export async function POST(req: Request) {
  // Validate the request body at the boundary.
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  const question = (body?.question ?? "").toString().trim();
  if (!question) return new Response("Missing 'question'", { status: 400 });
  if (question.length > MAX_QUESTION_LEN) {
    return new Response("Question too long", { status: 413 });
  }

  // Abuse guards run BEFORE any embedding/generation call so a flood of traffic
  // can't run up the provider bill. On any limit, return a friendly JSON error.
  const verdict = await runGuards(req, body?.turnstileToken);
  if (!verdict.ok) {
    return Response.json(
      { error: verdict.error, message: verdict.message },
      { status: verdict.status },
    );
  }

  let index: IndexEntry[];
  try {
    index = await loadIndex();
  } catch {
    return new Response(
      "Search index not found. Run `npm run ingest` to build data/index.json.",
      { status: 503 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 1. Embed the question and retrieve the top-k grounding chunks.
        const qVec = await embedQuery(question);
        const retrieved = cosineTopK(qVec, index, TOP_K);

        // 2. Send the sources up front so the UI can render them immediately.
        const sources: SourceRef[] = retrieved.map((r, i) => ({
          index: i,
          source: r.source,
          url: r.url,
          headingPath: r.headingPath,
          text: r.text,
        }));
        controller.enqueue(line({ type: "sources", sources }));

        // 3. Stream the grounded answer; forward text + citation events.
        // generation.ts already maps the model's inline [n] markers to CitationRefs.
        for await (const event of streamAnswer(question, retrieved)) {
          if (event.type === "text") {
            controller.enqueue(line({ type: "text", text: event.text }));
          } else {
            controller.enqueue(line({ type: "citation", citation: event.citation }));
          }
        }

        controller.enqueue(line({ type: "done" }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(line({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
