// Build-time ingestion: load docs/*.md → chunk → embed (Gemini) → write data/index.json.
// Run once with `npm run ingest` (needs GEMINI_API_KEY). Re-run to rebuild the index.
//
// Scripts use RELATIVE imports (not the @/ alias) because tsx does not read tsconfig paths.
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { embedTexts } from "../lib/embeddings.js";
import { CHUNK_TOKENS, CHUNK_OVERLAP_TOKENS, EMBED_MODEL } from "../lib/config.js";
import type { Chunk, IndexEntry } from "../lib/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const OUT = path.join(ROOT, "data", "index.json");

// Tokens → words (~0.75 words per token is a safe approximation for English prose).
const CHUNK_WORDS = Math.round(CHUNK_TOKENS * 0.75);
const OVERLAP_WORDS = Math.round(CHUNK_OVERLAP_TOKENS * 0.75);

function slugify(file: string): string {
  return file.replace(/\.md$/i, "");
}

/** Pull the H1 title; fall back to a title-cased file slug. */
function deriveTitle(md: string, file: string): string {
  const h1 = md.match(/^\s*#\s+(.+?)\s*$/m);
  if (h1) return h1[1].trim();
  return slugify(file)
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Strip a leading YAML front-matter block, if present (CRLF- and LF-tolerant). */
function stripFrontMatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

interface Para {
  text: string;
  heading: string; // nearest heading trail at this point
}

/** Split markdown into paragraphs, tracking the nearest heading breadcrumb for each. */
function toParagraphs(md: string, title: string): Para[] {
  const lines = md.split(/\r?\n/);
  const paras: Para[] = [];
  let buf: string[] = [];
  const headingStack: string[] = [title];

  const flush = () => {
    const text = buf.join(" ").trim();
    if (text) paras.push({ text, heading: headingStack.join(" > ") });
    buf = [];
  };

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (h) {
      flush();
      const level = h[1].length; // 1..6 ; H1 is the doc title (level 1)
      headingStack.length = Math.max(1, level - 1); // keep ancestors above this level
      headingStack[level - 1] = h[2].trim();
      continue;
    }
    if (line.trim() === "") {
      flush();
    } else {
      buf.push(line.trim());
    }
  }
  flush();
  return paras;
}

/** Accumulate paragraphs into ~CHUNK_WORDS chunks with ~OVERLAP_WORDS word overlap. */
function chunkDoc(paras: Para[], source: string, url: string): Chunk[] {
  const chunks: Chunk[] = [];
  let words: string[] = [];
  let heading = paras[0]?.heading ?? source;
  let startHeading = heading;

  const emit = () => {
    const text = words.join(" ").trim();
    if (!text) return;
    chunks.push({
      id: `${url}#${chunks.length}`,
      source,
      url,
      headingPath: startHeading,
      text,
    });
  };

  for (const p of paras) {
    if (words.length === 0) startHeading = p.heading;
    heading = p.heading;
    const pWords = p.text.split(/\s+/);
    words.push(...pWords);
    if (words.length >= CHUNK_WORDS) {
      emit();
      // Carry the last OVERLAP_WORDS words into the next chunk for context continuity.
      words = words.slice(Math.max(0, words.length - OVERLAP_WORDS));
      startHeading = heading;
    }
  }
  if (words.length > OVERLAP_WORDS || chunks.length === 0) emit();
  return chunks;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "ERROR: GEMINI_API_KEY is not set. Copy .env.example to .env.local and add your key,\n" +
        "then run again. (Embeddings come from Google Gemini's free tier — get a key at\n" +
        "https://aistudio.google.com/apikey. No credit card required.)",
    );
    process.exit(1);
  }

  const files = (await fs.readdir(DOCS_DIR)).filter((f) => f.toLowerCase().endsWith(".md"));
  if (files.length === 0) {
    console.error(`ERROR: no .md files found in ${DOCS_DIR}`);
    process.exit(1);
  }

  const allChunks: Chunk[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(DOCS_DIR, file), "utf-8");
    const md = stripFrontMatter(raw);
    const title = deriveTitle(md, file);
    const url = `/docs/${slugify(file)}`;
    const chunks = chunkDoc(toParagraphs(md, title), title, url);
    allChunks.push(...chunks);
    console.log(`  ${file.padEnd(34)} → ${chunks.length} chunk(s)`);
  }

  console.log(`\nEmbedding ${allChunks.length} chunks with ${EMBED_MODEL} ...`);
  const vectors = await embedTexts(allChunks.map((c) => c.text));
  if (vectors.length !== allChunks.length) {
    console.error(`ERROR: embedding count ${vectors.length} != chunk count ${allChunks.length}`);
    process.exit(1);
  }

  const index: IndexEntry[] = allChunks.map((c, i) => ({ ...c, embedding: vectors[i] }));
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(index, null, 2), "utf-8");

  const mb = (Buffer.byteLength(JSON.stringify(index)) / 1e6).toFixed(2);
  console.log(
    `\nDone. ${files.length} docs → ${index.length} chunks → ${OUT} (${mb} MB). ` +
      `Run \`npm run dev\` and ask a question.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
