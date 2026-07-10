// Abuse guards for the public demo. Checked at the API boundary BEFORE any
// embedding or generation call runs, so a burst of traffic can't run up the
// OpenRouter/Gemini bill.
//
// IMPORTANT: the rate-limit and daily-cap state below lives in module-scope
// Maps — i.e. in the memory of a single server process. On a serverless host
// (Vercel, Lambda) each instance has its own copy and instances come and go, so
// these limits are **per-instance best-effort**, not a global guarantee. They
// exist to blunt casual abuse and accidental loops. The real, hard backstop is
// the provider-side credit cap on the OpenRouter key: fund it with a few
// dollars and it physically cannot spend more than that, no matter how the
// in-memory limiters behave.

// --- Tunables ---------------------------------------------------------------
/** Per-IP sliding window: at most this many requests per WINDOW_MS. */
const PER_IP_LIMIT = 6;
const WINDOW_MS = 60_000; // 1 minute
/** Global kill-switch: at most this many served requests per UTC day. */
const DAILY_CAP = 200;

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// --- In-memory, per-instance state ------------------------------------------
// Maps live for the lifetime of the process. See the module header: best-effort
// on serverless; the credit cap is the real limit.
const ipHits = new Map<string, number[]>(); // ip -> recent request timestamps (ms)
const daily = { day: utcDay(), count: 0 }; // resets when the UTC day rolls over

function utcDay(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/** Read the caller's IP from the first hop of x-forwarded-for; else "unknown". */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export type GuardVerdict =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

const COOLING_DOWN: GuardVerdict = {
  ok: false,
  status: 429,
  error: "cooling_down",
  message: "The demo is cooling down — try again in a minute.",
};

/**
 * Check the global daily cap and the per-IP sliding window. A served request is
 * recorded against both counters only when it is allowed through, so a blocked
 * caller doesn't burn the global daily budget. Call this BEFORE doing any work.
 */
export function checkRateLimits(ip: string, now = Date.now()): GuardVerdict {
  // 1. Global daily cap (UTC-day kill-switch).
  const today = utcDay();
  if (daily.day !== today) {
    daily.day = today;
    daily.count = 0;
  }
  if (daily.count >= DAILY_CAP) return COOLING_DOWN;

  // 2. Per-IP sliding window over the last WINDOW_MS.
  const cutoff = now - WINDOW_MS;
  const recent = (ipHits.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= PER_IP_LIMIT) {
    ipHits.set(ip, recent); // keep the pruned window so it decays correctly
    return COOLING_DOWN;
  }

  // Allowed — record the hit against both counters.
  recent.push(now);
  ipHits.set(ip, recent);
  daily.count += 1;
  return { ok: true };
}

/**
 * Cloudflare Turnstile verification — fully env-gated.
 * If TURNSTILE_SECRET_KEY is unset, verification is skipped entirely (ok).
 * If set, the request body must carry a `turnstileToken` we verify server-side.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<GuardVerdict> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // Turnstile disabled — nothing to check.

  const fail: GuardVerdict = {
    ok: false,
    status: 403,
    error: "turnstile_failed",
    message: "Please complete the verification and try again.",
  };
  if (!token) return fail;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success ? { ok: true } : fail;
  } catch {
    // Network hiccup talking to Cloudflare — fail closed.
    return fail;
  }
}

/**
 * Run all abuse guards for a request. Returns { ok: true } to proceed, or a
 * verdict carrying the HTTP status + JSON error/message to return to the client.
 */
export async function runGuards(
  req: Request,
  turnstileToken: string | undefined,
): Promise<GuardVerdict> {
  const ip = clientIp(req);
  const limited = checkRateLimits(ip);
  if (!limited.ok) return limited;
  return verifyTurnstile(turnstileToken, ip);
}
