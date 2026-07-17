"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowUp, Sparkles, ChevronDown, AlertCircle, X } from "lucide-react";
import type { StreamEvent, SourceRef, CitationRef } from "@/lib/types";
import styles from "./chat.module.css";

// ---------------------------------------------------------------------------
// Local view model. One `Turn` = a user question + its grounded answer, plus
// the sources it was grounded in and the citations the model emitted.
// ---------------------------------------------------------------------------

type TurnStatus = "streaming" | "done" | "error";

interface Turn {
  id: string;
  question: string;
  answer: string;
  sources: SourceRef[];
  citations: CitationRef[];
  status: TurnStatus;
  error?: string;
}

// Suggested questions for the empty state. The first three fit a SaaS
// help-center corpus (billing, a feature, security); the fourth is
// deliberately off-corpus to show the honest "I don't know" behavior.
const SUGGESTIONS: { q: string; offTopic?: boolean }[] = [
  { q: "What pricing plans are available and how does billing work?" },
  { q: "How do I invite teammates to my workspace?" },
  { q: "How do you keep my data secure?" },
  { q: "What's the weather like in Tokyo today?", offTopic: true },
];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

// Minimal, streaming-safe render transform: turn **bold** spans into <strong>.
// Bold only — no other markdown. A dangling "**" (mid-stream) stays literal
// until its closing pair arrives. Plain text otherwise, so it's XSS-safe.
function renderAnswer(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Cloudflare Turnstile is fully env-gated: the widget only renders when a site
// key is configured. Inlined at build time by Next for client bundles.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileAPI {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "auto" | "light" | "dark";
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

function getTurnstile(): TurnstileAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { turnstile?: TurnstileAPI }).turnstile;
}

export default function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileWidgetRef = useRef<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reduced-transparency: no CSS media query exists, so wire it once at the app
  // root. The .reduce-transparency ancestor class makes every glass surface
  // opaque and drops blur (see ios26.css).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "reduce-transparency",
        mq.matches,
      );
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ---- update a single turn immutably -------------------------------------
  const patchTurn = useCallback(
    (id: string, fn: (t: Turn) => Turn) => {
      setTurns((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
    },
    [],
  );

  const handleEvent = useCallback(
    (turnId: string, ev: StreamEvent) => {
      switch (ev.type) {
        case "sources":
          patchTurn(turnId, (t) => ({ ...t, sources: ev.sources }));
          break;
        case "text":
          patchTurn(turnId, (t) => ({ ...t, answer: t.answer + ev.text }));
          break;
        case "citation":
          patchTurn(turnId, (t) => ({
            ...t,
            citations: [...t.citations, ev.citation],
          }));
          break;
        case "done":
          patchTurn(turnId, (t) =>
            t.status === "error" ? t : { ...t, status: "done" },
          );
          break;
        case "error":
          patchTurn(turnId, (t) => ({
            ...t,
            status: "error",
            error: ev.message,
          }));
          setToast(ev.message);
          break;
      }
    },
    [patchTurn],
  );

  // ---- the streaming request ----------------------------------------------
  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || streaming) return;
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        // Turnstile is required but not solved yet — avoid a guaranteed 403
        // round-trip and surface the same friendly notice the server would.
        setToast("Please complete the verification and try again.");
        return;
      }

      const turnId = newId();
      setTurns((prev) => [
        ...prev,
        {
          id: turnId,
          question,
          answer: "",
          sources: [],
          citations: [],
          status: "streaming",
        },
      ]);
      setInput("");
      setStreaming(true);
      pinnedRef.current = true;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            ...(turnstileToken ? { turnstileToken } : {}),
          }),
        });

        if (!res.ok || !res.body) {
          // The guard layer replies with JSON { error, message } (e.g. a 429
          // "cooling_down"). Surface the friendly message as a notice rather
          // than a raw error string.
          const detail = await res.text().catch(() => "");
          let friendly = "";
          try {
            const parsed = JSON.parse(detail) as { message?: string };
            if (parsed?.message) friendly = parsed.message;
          } catch {
            /* not JSON — fall back to the raw text below */
          }
          throw new Error(
            friendly || detail.trim() || `Request failed (${res.status})`,
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Read the NDJSON stream. Buffer partial lines: split on "\n" and keep
        // the trailing incomplete fragment for the next chunk.
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const lineRaw of lines) {
            const lineStr = lineRaw.trim();
            if (!lineStr) continue;
            let ev: StreamEvent;
            try {
              ev = JSON.parse(lineStr) as StreamEvent;
            } catch {
              continue; // skip a malformed line rather than abort the stream
            }
            handleEvent(turnId, ev);
          }
        }

        // Flush a final line that wasn't newline-terminated.
        const tail = buffer.trim();
        if (tail) {
          try {
            handleEvent(turnId, JSON.parse(tail) as StreamEvent);
          } catch {
            /* ignore trailing noise */
          }
        }

        // Safety net: if the stream ended without an explicit "done".
        patchTurn(turnId, (t) =>
          t.status === "streaming" ? { ...t, status: "done" } : t,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        patchTurn(turnId, (t) => ({ ...t, status: "error", error: message }));
        setToast(message);
      } finally {
        setStreaming(false);
        // Turnstile tokens are single-use — reset the widget so the next
        // request gets a fresh one.
        if (TURNSTILE_SITE_KEY) {
          const api = getTurnstile();
          if (api && turnstileWidgetRef.current) {
            api.reset(turnstileWidgetRef.current);
          }
          setTurnstileToken(null);
        }
      }
    },
    [streaming, handleEvent, patchTurn, turnstileToken],
  );

  // ---- jump from a citation chip to its source ----------------------------
  const jumpToSource = useCallback((turnId: string, index: number) => {
    setCollapsed((prev) => ({ ...prev, [turnId]: false }));
    const key = `${turnId}:${index}`;
    setActiveSource(key);
    requestAnimationFrame(() => {
      document
        .getElementById(`src-${turnId}-${index}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  // clear the highlight after a moment
  useEffect(() => {
    if (!activeSource) return;
    const t = setTimeout(() => setActiveSource(null), 2200);
    return () => clearTimeout(t);
  }, [activeSource]);

  // auto-dismiss the error toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // keep the thread pinned to the bottom while streaming, unless the user
  // has scrolled up to read something.
  useEffect(() => {
    const el = threadRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const onThreadScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    pinnedRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 96;
  }, []);

  // auto-grow the composer textarea
  const onInput = useCallback((value: string) => {
    setInput(value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!streaming) {
          const el = textareaRef.current;
          if (el) el.style.height = "auto";
          void ask(input);
        }
      }
    },
    [ask, input, streaming],
  );

  const isEmpty = turns.length === 0;

  return (
    <section className={styles.wrap} aria-label="Chat with the docs">
      <header className={styles.bar}>
        <span className={styles.barDot} aria-hidden />
        <span className={styles.barTitle}>Docs assistant</span>
        <span className={styles.barHint}>grounded · cited · streaming</span>
      </header>

      <div
        className={styles.thread}
        ref={threadRef}
        onScroll={onThreadScroll}
        role="log"
        aria-live="polite"
      >
        {isEmpty ? (
          <div className={styles.empty}>
            <div className={styles.emptyGlow} aria-hidden />
            <h2 className={styles.emptyTitle}>Ask the docs anything</h2>
            <p className={styles.emptySub}>
              Answers are grounded in the documentation and every claim links
              back to its source. Try one of these:
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.q}
                  type="button"
                  className={
                    s.offTopic
                      ? `${styles.suggestion} ${styles.suggestionOff}`
                      : styles.suggestion
                  }
                  onClick={() => ask(s.q)}
                  disabled={streaming}
                >
                  {s.offTopic && (
                    <span className={styles.offBadge}>off-topic</span>
                  )}
                  <span>{s.q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className={styles.turns}>
            {turns.map((turn) => (
              <li key={turn.id} className={styles.turn}>
                {/* question */}
                <div className={`${styles.row} ${styles.rowUser}`}>
                  <div className={`${styles.bubble} ${styles.bubbleUser}`}>
                    {turn.question}
                  </div>
                </div>

                {/* answer */}
                <div className={`${styles.row} ${styles.rowBot}`}>
                  <div className={styles.avatar} aria-hidden>
                    <Sparkles size={16} strokeWidth={1.8} />
                  </div>
                  <div className={styles.botCol}>
                    <div
                      className={`${styles.bubble} ${styles.bubbleBot}${
                        turn.status === "error" ? ` ${styles.bubbleErr}` : ""
                      }`}
                    >
                      {turn.status === "streaming" && !turn.answer ? (
                        <Typing />
                      ) : turn.status === "error" ? (
                        <span className={styles.errText}>
                          {turn.error ?? "Something went wrong."}
                        </span>
                      ) : (
                        <>
                          {renderAnswer(turn.answer)}
                          {turn.status === "streaming" && (
                            <span className={styles.caret} aria-hidden />
                          )}
                        </>
                      )}
                    </div>

                    {/* citation chips */}
                    {turn.citations.length > 0 && (
                      <div
                        className={styles.chips}
                        aria-label="Citations"
                      >
                        <span className={styles.chipsLabel}>Citations</span>
                        {turn.citations.map((c, i) => (
                          <button
                            key={`${turn.id}-cit-${i}`}
                            type="button"
                            className={styles.chip}
                            onClick={() =>
                              jumpToSource(turn.id, c.documentIndex)
                            }
                            title={c.citedText}
                          >
                            <span className={styles.chipNum}>
                              {c.documentIndex + 1}
                            </span>
                            <span className={styles.chipSrc}>{c.source}</span>
                            <span className={styles.chipTip}>
                              <span className={styles.chipTipSrc}>
                                {c.source}
                              </span>
                              “{c.citedText}”
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* sources panel */}
                    {turn.sources.length > 0 && (
                      <div className={styles.sources}>
                        <button
                          type="button"
                          className={styles.sourcesHead}
                          onClick={() =>
                            setCollapsed((prev) => ({
                              ...prev,
                              [turn.id]: !(prev[turn.id] ?? false),
                            }))
                          }
                          aria-expanded={!(collapsed[turn.id] ?? false)}
                        >
                          <span
                            className={`${styles.caretIcon}${
                              collapsed[turn.id] ? ` ${styles.caretClosed}` : ""
                            }`}
                            aria-hidden
                          >
                            <ChevronDown size={15} strokeWidth={2} />
                          </span>
                          Sources
                          <span className={styles.sourcesCount}>
                            {turn.sources.length}
                          </span>
                        </button>

                        {!(collapsed[turn.id] ?? false) && (
                          <ul className={styles.sourceList}>
                            {turn.sources.map((s) => {
                              const isActive =
                                activeSource === `${turn.id}:${s.index}`;
                              return (
                                <li
                                  key={`${turn.id}-src-${s.index}`}
                                  id={`src-${turn.id}-${s.index}`}
                                  className={`${styles.source}${
                                    isActive ? ` ${styles.sourceActive}` : ""
                                  }`}
                                >
                                  <span className={styles.sourceIndex}>
                                    {s.index + 1}
                                  </span>
                                  <div className={styles.sourceBody}>
                                    <div className={styles.sourceTop}>
                                      {s.url ? (
                                        <a
                                          className={styles.sourceTitle}
                                          href={s.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {s.source}
                                        </a>
                                      ) : (
                                        <span className={styles.sourceTitle}>
                                          {s.source}
                                        </span>
                                      )}
                                      {s.headingPath &&
                                        s.headingPath !== s.source && (
                                          <span className={styles.sourceCrumb}>
                                            {s.headingPath}
                                          </span>
                                        )}
                                    </div>
                                    <p className={styles.sourceText}>
                                      {s.text}
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Turnstile widget — only rendered when a site key is configured. */}
      {TURNSTILE_SITE_KEY && (
        <div className={styles.turnstile}>
          <Turnstile
            siteKey={TURNSTILE_SITE_KEY}
            onToken={setTurnstileToken}
            onReady={(id) => {
              turnstileWidgetRef.current = id;
            }}
          />
        </div>
      )}

      {/* composer */}
      <div className={styles.composer}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question about the docs…"
          rows={1}
          disabled={streaming}
          aria-label="Your question"
        />
        <button
          type="button"
          className={styles.send}
          onClick={() => ask(input)}
          disabled={streaming || !input.trim()}
          aria-label="Send"
        >
          {streaming ? (
            <span className={styles.spinner} aria-hidden />
          ) : (
            <ArrowUp size={20} strokeWidth={2.2} aria-hidden />
          )}
        </button>
      </div>

      {/* error toast */}
      {toast && (
        <div className={styles.toast} role="alert">
          <span className={styles.toastIcon} aria-hidden>
            <AlertCircle size={18} strokeWidth={2} />
          </span>
          <span className={styles.toastMsg}>{toast}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Dismiss"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}

// Loads the Cloudflare Turnstile script once and renders an explicit widget.
// Reports the widget id up (for reset) and the solved token up (for the request).
function Turnstile({
  siteKey,
  onToken,
  onReady,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onReady: (widgetId: string | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SCRIPT_ID = "cf-turnstile-script";
    let widgetId: string | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;

    const render = () => {
      const api = getTurnstile();
      if (!api || !boxRef.current) return;
      widgetId = api.render(boxRef.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
        theme: "auto",
      });
      onReady(widgetId);
    };

    if (getTurnstile()) {
      render();
    } else if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      // Script tag present but the API hasn't attached yet — poll briefly,
      // but bail after ~10s so a script that never attaches doesn't poll
      // forever. Treat a timeout as the no-token state (same as expired/error).
      const POLL_INTERVAL_MS = 200;
      const POLL_TIMEOUT_MS = 10_000;
      let elapsed = 0;
      poll = setInterval(() => {
        if (getTurnstile()) {
          if (poll) clearInterval(poll);
          render();
          return;
        }
        elapsed += POLL_INTERVAL_MS;
        if (elapsed >= POLL_TIMEOUT_MS) {
          if (poll) clearInterval(poll);
          onToken(null);
        }
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (poll) clearInterval(poll);
      const api = getTurnstile();
      if (api && widgetId) api.remove(widgetId);
      onReady(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  return <div ref={boxRef} />;
}

function Typing() {
  return (
    <span className={styles.typing} aria-label="Assistant is thinking">
      <span className={styles.typingHint}>Retrieving &amp; grounding</span>
      <span className={styles.dots} aria-hidden>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </span>
  );
}
