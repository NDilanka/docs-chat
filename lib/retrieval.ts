import type { IndexEntry, Retrieved } from "./types";

/** Cosine similarity of two equal-length vectors. Returns 0 if either is a zero vector. */
export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Pure linear top-k cosine search over the in-memory index.
 * Sub-millisecond for a few hundred chunks — no vector DB needed for the demo.
 * (The "store seam": swap this for Convex/Upstash vector search for large client corpora,
 * keeping the same signature, and the route + UI are untouched.)
 */
export function cosineTopK(query: number[], index: IndexEntry[], k: number): Retrieved[] {
  return index
    .map((entry) => ({ ...entry, score: cosineSim(query, entry.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
