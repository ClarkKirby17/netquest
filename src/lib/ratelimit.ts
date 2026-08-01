import { and, count, eq, gt, sql } from "drizzle-orm";
import { db, auditLogs } from "@/db";

/* Rate limiting built on the audit log rather than an in-memory counter.
   Serverless functions are stateless and short-lived, so anything held
   in memory resets constantly and provides no real protection — the
   database is the only shared state we have. */

export type Limit = { max: number; windowMinutes: number };

export const LIMITS = {
  login: { max: 5, windowMinutes: 15 },
  register: { max: 5, windowMinutes: 60 },
  verify: { max: 10, windowMinutes: 15 },
  passwordReset: { max: 3, windowMinutes: 60 },
  resendCode: { max: 4, windowMinutes: 15 },
} as const satisfies Record<string, Limit>;

export type LimitKey = keyof typeof LIMITS;

/**
 * How many times this key has been recorded for this identifier inside
 * the window. `identifier` is normally an email — the value stored in
 * the audit entry's details column.
 */
export async function attemptsSince(
  event: string,
  identifier: string,
  windowMinutes: number
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const [row] = await db
    .select({ n: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.event, event),
        eq(auditLogs.details, identifier),
        gt(auditLogs.createdAt, since)
      )
    );
  return Number(row?.n ?? 0);
}

/** Record an attempt so it counts toward the limit. */
export async function recordAttempt(event: string, identifier: string) {
  await db.insert(auditLogs).values({ event, details: identifier });
}

/**
 * Returns an error message when the caller is over the limit, or null
 * when they may proceed. The message states the window so the person
 * knows how long to wait rather than guessing.
 */
export async function checkLimit(
  key: LimitKey,
  identifier: string
): Promise<string | null> {
  const { max, windowMinutes } = LIMITS[key];
  const event = `ratelimit.${key}`;
  const used = await attemptsSince(event, identifier, windowMinutes);

  if (used >= max) {
    const wait =
      windowMinutes >= 60
        ? `${windowMinutes / 60} hour${windowMinutes === 60 ? "" : "s"}`
        : `${windowMinutes} minutes`;
    return `Too many attempts. Try again in ${wait}.`;
  }

  await recordAttempt(event, identifier);
  return null;
}
