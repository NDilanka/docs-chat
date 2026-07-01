// Offline unit test for cosineTopK — runs without any API keys.
// Uses synthetic orthogonal vectors so the expected ranking is unambiguous.
//   npm run test:retrieval
import { cosineTopK } from "../lib/retrieval.js";
import type { IndexEntry } from "../lib/types.js";

const index: IndexEntry[] = [
  { id: "a", source: "alpha.md", text: "all about cats", embedding: [1, 0, 0, 0] },
  { id: "b", source: "beta.md", text: "all about dogs", embedding: [0, 1, 0, 0] },
  { id: "c", source: "gamma.md", text: "all about birds", embedding: [0, 0, 1, 0] },
  { id: "d", source: "delta.md", text: "all about fish", embedding: [0, 0, 0, 1] },
];

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

// Query closest to "alpha".
const top = cosineTopK([0.9, 0.1, 0, 0], index, 2);
check("returns k results", top.length === 2);
check("top hit is the nearest vector (alpha)", top[0].id === "a");
check("results are sorted by descending score", top[0].score >= top[1].score);
check("score is a sensible cosine value (0..1)", top[0].score > 0.9 && top[0].score <= 1);

// A query orthogonal-ish to gamma should surface gamma first.
const top2 = cosineTopK([0, 0.1, 0.95, 0], index, 1);
check("different query retrieves the matching doc (gamma)", top2[0].id === "c");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll retrieval checks passed.");
