# Demo Video Script — 60–90s

**Goal:** prove the pitch — *"I drop production AI features into existing
React/Next apps."* Record at the **live Vercel URL** (not localhost) so it's
obviously deployed. Keep the cursor visible. Capture the stream in **one
continuous take** — don't cut while tokens are typing.

Total runtime: ~85 seconds. Times are cumulative.

---

### 1 · Hook + context — (0:00–0:08)

**On screen:** the product page, full view. Title "Chat with your docs" with the
chat panel sitting in it as one component.

> "This is a real RAG feature dropped into a Next.js app — a chat that's
> grounded in the docs, with citations. Notice it's just one panel on a normal
> page."

---

### 2 · Ask + stream — (0:08–0:30)

**On screen:** click a suggested question (e.g. *"What pricing plans are
available and how does billing work?"*). Let the answer **stream in live** — do
not speed up or cut.

> "I'll ask a real question. The answer streams in token by token — and it's
> only using what's actually in the documentation."

*(Let the full answer finish typing on screen. This is the "feels like a
product" beat.)*

---

### 3 · The trust beat — (0:30–0:50)

**On screen:** hover a **citation chip** to show the exact cited snippet, then
click it → the sources panel scrolls to and **highlights the matching passage**.

> "Every claim is grounded. Here's the source it used — click the citation and
> it jumps straight to the exact passage. This is verifiable, not a guess."

---

### 4 · The honesty beat — (0:50–1:05)

**On screen:** click the off-topic suggestion (*"What's the weather like in Tokyo
today?"*) or type something clearly outside the corpus.

> "And when I ask something that isn't in the docs — it says so. No
> hallucinations. It only answers from your content."

---

### 5 · The integration beat — (1:05–1:20)

**On screen:** flash the code, three quick frames — `lib/retrieval.ts`
(`cosineTopK`), the Anthropic `document`-blocks-with-citations call in
`app/api/chat/route.ts`, and the streaming `<Chat />` component.

> "Under the hood: embeddings, cosine retrieval, grounded generation with
> Claude's native citations, and a streaming route — all production-ready,
> inside your existing React and Next app."

---

### 6 · CTA — (1:20–1:25)

**On screen:** back to the live URL; brief pan of the finished page.

> "I'll build this into your app. Link's in my profile."

---

## Capture checklist

- [ ] Record at the **live URL**, not localhost.
- [ ] One continuous take for the streaming answer (no cuts).
- [ ] Cursor visible throughout; hover the chip before clicking it.
- [ ] Show the source passage actually highlight on citation click.
- [ ] Include the off-corpus "I don't know" moment.
- [ ] Optional B-roll: the same flow on a phone screen for credibility.

## Thumbnail

A single clean frame — a chat bubble mid-stream with a glowing citation chip and
the matching source highlighted. Caption:
*"RAG chat with citations — dropped into your Next.js app."*
