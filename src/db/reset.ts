/* Wipe every application table without inserting anything.
 *
 * Use this when you want a clean database and then a specific seed —
 * typically:  npm run db:reset  &&  npm run db:seed:prod
 *
 * DESTRUCTIVE. Every account, module, score, and log is deleted.
 * Guarded so it can't run by accident: you must pass the database
 * host as an argument, which forces you to look at which database
 * you're actually pointing at.
 *
 *   npm run db:reset -- --confirm=<host-fragment>
 *
 * e.g. if DATABASE_URL points at aws-1-ap-northeast-2.pooler.supabase.com
 *   npm run db:reset -- --confirm=aws-1-ap-northeast-2
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL first.");

const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "unknown-host";
  }
})();

const arg = process.argv.find((a) => a.startsWith("--confirm="));
const confirmation = arg?.split("=")[1] ?? "";

if (!confirmation || !host.includes(confirmation)) {
  console.error(`
  Refusing to wipe without confirmation.

  This would delete EVERYTHING in:
      ${host}

  Re-run with a fragment of that host to confirm you mean it:
      npm run db:reset -- --confirm=${host.split(".")[0]}
`);
  process.exit(1);
}

const TABLES = [
  "users", "courses", "sections", "student_profiles", "instructor_profiles",
  "modules", "lessons", "lesson_progress", "module_progress",
  "quizzes", "quiz_questions", "quiz_attempts",
  "gamification", "badges", "user_badges", "game_scores", "door_questions",
  "cli_missions", "cli_objectives",
  "notifications", "audit_logs", "app_settings",
  "verification_codes", "password_resets",
];

const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await sql.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  console.log(`Wiped ${TABLES.length} tables on ${host}.`);
  console.log("Next:  npm run db:seed:prod   (or npm run db:seed for the dev dataset)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sql.end());
