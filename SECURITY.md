# NetQuest — security notes

A summary of the controls in place, what they cover, and what is
deliberately out of scope. Written for handover and defence.

## 1. Authentication

- Passwords hashed with **bcrypt, cost 12**. Plaintext is never stored or logged.
- Sessions are **JWTs** (Auth.js v5), 7-day expiry, carrying only user id and role.
- **Email verification** by 6-digit code before an account can sign in. Codes are
  hashed in the database, expire after 15 minutes, and allow 5 attempts.
- **Approval gate**: verified accounts still require a human to approve them —
  students by their instructor, instructors by an admin.
- **Login throttling**: 5 failed attempts for one email within 15 minutes blocks
  further tries. Counted from the audit log, so it survives restarts.
- **Password change** requires the current password *and* a fresh emailed code.

## 2. Authorization

Two independent layers, because either alone has a gap.

- **Edge middleware** (`src/middleware.ts`) gates `/student`, `/instructor`,
  `/admin`, `/superadmin`, and `/account` before a page renders. A signed-in user
  hitting another role's portal is redirected to their own.
- **Per-action guards**: every server action calls `requireRole(...)` itself,
  because an action can be invoked without its page ever rendering.
- **Object-level scoping**: role checks are not enough. Instructor queries carry
  `instructorId` in the WHERE clause, so instructor A cannot approve, view, or
  edit instructor B's students, quizzes, or missions — even by guessing an id.

## 3. Input and output

- All external input validated with **Zod**, the same schema on client and server.
- Database access goes exclusively through **Drizzle**, which parameterises every
  query — no string-concatenated SQL anywhere.
- Rich-text lesson content is **sanitised on save** (`src/lib/sanitize.ts`):
  a tag/attribute whitelist strips `script`, `iframe`, event handlers, and
  `javascript:` URLs. This matters because lesson HTML renders unescaped in the
  student reader, so a compromised instructor account must not be able to plant
  script there.

## 4. Assessment integrity

- Quiz grading happens **only on the server**, keyed by question id.
- `questionsForAttempt()` deliberately omits `correctOption` and `explanation`,
  so the answers are never sent to the browser before submission.
- Availability (locked / cooldown / attempts exhausted) is **re-checked on submit**,
  so a bookmarked quiz URL cannot bypass a cooldown or an attempt limit.
- Arcade scores are normalised and capped server-side, with a daily limit on
  point-earning runs so the leaderboard cannot be ground out.

## 5. Progress integrity

- Module and lesson unlocking is decided by `src/lib/learning.ts` on the server.
  `readerContext()` returns null for a lesson the student may not open, so a
  guessed URL yields a 404 rather than the content.
- Page advancement is bounded: a student may only reach one page beyond their
  furthest, so progress cannot be skipped by editing a request.
- Reward paths are **idempotent** — `pointsAwarded` and the unique constraint on
  `user_badges` prevent double-awarding on re-entry.

## 6. Auditing

Every privileged action writes to `audit_logs`: sign-ins and failures, approvals
and rejections, publishes, settings changes, exports, admin account changes, and
purges. Viewable and filterable at `/superadmin/audit`.

## 7. Availability guards

- The last active admin cannot be deactivated or deleted.
- A superadmin cannot deactivate or delete their own account.
- Deleting a section is blocked while an instructor is assigned to it.
- Publishing is blocked for modules with no lessons and quizzes with no questions.

## 8. Known limitations

Honest scope notes rather than omissions:

- **Email delivery** needs a provider configured. Brevo (`BREVO_API_KEY` plus a
  verified `MAIL_FROM`) reaches any recipient; Resend (`RESEND_API_KEY`) only
  reaches the account owner's address until a domain is verified. With neither
  set, codes are printed to the server console and shown on screen in
  development only.
- **Throttling is per-email, not per-IP.** A distributed attack across many
  addresses is not covered. Adequate for a class-sized deployment.
- **No 2FA.** The approval workflow is the primary identity control.
- **`trustHost` is enabled** so Auth.js can build callback URLs from the request
  host. This is correct on Vercel and behind any proxy that sets
  `X-Forwarded-Host` properly; a self-hosted deployment behind a proxy that
  passes an unsanitised Host header should pin `AUTH_URL` instead.
- **Seeded passwords are public** — they are in `src/db/seed.ts` and therefore in
  the repository. Change them before any public deployment.

## 9. Pre-deployment checklist

- [ ] Seed production with `npm run db:seed:prod`, **not** `npm run db:seed`
      (the development seed creates four accounts whose passwords are in the repo)
- [ ] Set `SUPERADMIN_PASSWORD` to something long and unique, in the host's
      environment rather than a committed file
- [ ] Set `AUTH_SECRET` to a fresh value (`npx auth secret`)
- [ ] Set `RESEND_API_KEY` so verification emails actually send
- [ ] Confirm `.env` is not committed (`git check-ignore .env`)
- [ ] Sign in as each of the four roles and confirm the others' portals are unreachable
- [ ] Verify a locked module's lesson URL returns 404 for a student who hasn't unlocked it
