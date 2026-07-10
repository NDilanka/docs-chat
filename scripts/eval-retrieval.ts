// Retrieval eval harness. For each question in data/eval-questions.json it
// embeds the query (Gemini), runs cosineTopK over data/index.json (top 5), and
// scores hit@1 / hit@5 — a "hit" means any of the question's expectedSources
// appears among the retrieved chunks. Prints a per-question PASS/FAIL table and
// summary percentages, and exits 1 if hit@5 falls below 80%.
//
// Requires GEMINI_API_KEY (embeddings) and data/index.json (build it with
// `npm run ingest`). If either is missing it prints a friendly message and
// exits 1 — so it's safe to wire up before keys exist.
//
// Scripts use RELATIVE imports (not the @/ alias) because tsx does not read
// tsconfig paths — same convention as scripts/ingest.ts.
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
// @next/env is a CommonJS bundle; default-import + destructure so it works
// under this package's ESM ("type": "module") resolution.
import nextEnv from "@next/env";
import { embedQuery } from "../lib/embeddings.js";
import { cosineTopK } from "../lib/retrieval.js";
import { TOP_K } from "../lib/config.js";
import type { IndexEntry } from "../lib/types.js";

// Load .env.local (and the other Next env files) so `npm run eval` picks up
// GEMINI_API_KEY from .env.local, not just the shell.
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "data", "index.json");
const QUESTIONS_PATH = path.join(ROOT, "data", "eval-questions.json");

/** hit@5 must be at least this fraction for the eval to pass. */
const PASS_THRESHOLD = 0.8;

interface EvalQuestion {
  question: string;
  /** Filenames (e.g. "billing-and-plans.md") that acceptably answer the question. */
  expectedSources: string[];
}

/**
 * Derive the source filename ("account-and-security.md") from a retrieved
 * entry's url ("/docs/account-and-security") or id ("/docs/account-and-security#3").
 * Deterministic and independent of the H1-derived display title.
 */
function fileOf(entry: { url?: string; id: string }): string {
  const slug = (entry.url ?? entry.id)
    .replace(/^\/docs\//, "")
    .replace(/#.*$/, "");
  return slug.endsWith(".md") ? slug : `${slug}.md`;
}

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    fail(
      "GEMINI_API_KEY is not set. The eval embeds each question with Google\n" +
        "Gemini's free tier — copy .env.example to .env.local and add your key\n" +
        "(https://aistudio.google.com/apikey, no credit card), then run again.",
    );
  }

  let index: IndexEntry[];
  try {
    index = JSON.parse(await fs.readFile(INDEX_PATH, "utf-8")) as IndexEntry[];
  } catch {
    fail(
      "Search index not found at data/index.json. Build it first with\n" +
        "`npm run ingest` (needs GEMINI_API_KEY), then run the eval again.",
    );
  }

  const questions = JSON.parse(
    await fs.readFile(QUESTIONS_PATH, "utf-8"),
  ) as EvalQuestion[];

  console.log(
    `Evaluating ${questions.length} questions against ${index.length} chunks (top ${TOP_K})...\n`,
  );

  let hit1 = 0;
  let hit5 = 0;
  const rows: string[] = [];

  for (const [i, q] of questions.entries()) {
    const qVec = await embedQuery(q.question);
    const top = cosineTopK(qVec, index, TOP_K);
    const files = top.map(fileOf);
    const isHit1 = files.length > 0 && q.expectedSources.includes(files[0]);
    const isHit5 = files.some((f) => q.expectedSources.includes(f));
    if (isHit1) hit1++;
    if (isHit5) hit5++;

    const status = isHit5 ? "PASS" : "FAIL";
    const topFile = (files[0] ?? "(none)").padEnd(30);
    rows.push(
      `${status}  #${String(i + 1).padStart(2, "0")}  @1:${isHit1 ? "Y" : "n"} @5:${isHit5 ? "Y" : "n"}  top=${topFile}  ${q.question}`,
    );
  }

  console.log(rows.join("\n"));

  const n = questions.length;
  const hit1pct = (hit1 / n) * 100;
  const hit5pct = (hit5 / n) * 100;
  console.log(
    `\nhit@1: ${hit1}/${n} (${hit1pct.toFixed(1)}%)   ` +
      `hit@5: ${hit5}/${n} (${hit5pct.toFixed(1)}%)`,
  );

  if (hit5 / n < PASS_THRESHOLD) {
    console.error(
      `\nFAIL: hit@5 ${hit5pct.toFixed(1)}% is below the ${PASS_THRESHOLD * 100}% threshold.`,
    );
    process.exit(1);
  }
  console.log(`\nPASS: hit@5 meets the ${PASS_THRESHOLD * 100}% threshold.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
