# NetQuest 2.0

Gamified networking academy — Next.js 15 · TypeScript · Tailwind v4 · Drizzle · Postgres (Supabase) · deploys to Vercel.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in DATABASE_URL from Supabase
npx auth secret                # writes AUTH_SECRET
npm run db:push                # creates the tables in Supabase
npm run dev                    # http://localhost:3000
```

Supabase → Project Settings → Database → Connection string → **URI**.
Use the **Transaction pooler** string (port 6543) for `DATABASE_URL`
and the direct string (port 5432) for `DIRECT_URL`.

`npm run db:studio` opens a table browser, similar to phpMyAdmin.

## Status

- [x] Phase 1 — project setup, design system, database schema, landing page
- [x] Phase 2 — auth: register, 6-digit verify, single login, approval gate, route protection
- [x] Phase 3 — instructor portal (approvals, Tiptap authoring), admin portal (approvals, release, courses, users)
- [x] Phase 4 — student portal: modules, lesson reader, progress, account settings
- [x] Phase 5 — sequential unlocking + resume
- [x] Phase 6 — quiz system: authoring, attempts, cooldowns, server grading, answer review
- [x] Phase 7 — gamification (XP, levels, streaks, 12 badges) + three arcade games
- [x] Phase 8 — analytics dashboards + four CSV reports (scoped per role)
- [x] Phase 9 — superadmin portal, live settings, security review (see SECURITY.md)

## Notes carried from v1

- Sections now belong to a course, so a student cannot pick a section from another course.
- One `users` table with a role enum replaces the four separate role tables.
- A superadmin is seeded by `npm run db:seed` — v1's SQL never inserted one, so that login was impossible.

## Test accounts (after `npm run db:seed`)

| Email | Role | Password |
|---|---|---|
| super@netquest.test | superadmin | Password123 |
| admin@netquest.test | admin | Password123 |
| instructor@netquest.test | instructor | Password123 |
| student@netquest.test | student | Password123 |

Without RESEND_API_KEY set, verification codes print to the dev server
console and appear on the verify page in a dev-mode banner.

## Who owns what

| | Admin | Professor |
|---|---|---|
| Modules & lessons | authors + publishes | reads only |
| Quizzes | writes a shared **default** per module | writes **their own**, or copies the default |
| Arcade questions | maintains the **global pool** | adds their own **on top** |
| Approvals | instructors | their own students |

A student takes their professor's quiz; if that professor hasn't written one,
the admin default applies; if there's no default either, the module completes
on lessons alone — a student is never trapped by a missing quiz.

## Seeding

| Command | What it does |
|---|---|
| `npm run db:seed` | Development dataset — four test accounts (`Password123`), full curriculum. Wipes first. |
| `npm run db:seed:prod` | Superadmin from env vars + badges, plus curriculum if `SEED_SAMPLE_CONTENT=true`. Never wipes, never creates test accounts. |
| `npm run db:reset -- --confirm=<host>` | Wipes every table and inserts nothing. |

To move from test data to a clean production dataset:

```bash
npm run db:reset -- --confirm=<your-db-host-fragment>
npm run db:seed:prod
```
