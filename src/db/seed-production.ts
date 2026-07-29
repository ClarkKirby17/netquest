/* Production seed — the bare minimum to stand the platform up.
 *
 * Always creates:
 *   · one superadmin, with credentials taken from the environment
 *   · the badge catalogue (achievements break without it)
 *   · default platform settings
 *
 * Also creates, unless SEED_SAMPLE_CONTENT=false:
 *   · the Networking Today module, its three lessons, a quiz, the
 *     arcade question pool, and three CLI missions
 *
 * Never creates test accounts, so no password from this repository
 * ever exists on the deployed site.
 *
 * Run:  npm run db:seed:prod
 *
 * Requires in .env (or the host's env):
 *   SUPERADMIN_EMAIL=you@school.edu
 *   SUPERADMIN_PASSWORD=<a long password you chose>
 *   SUPERADMIN_NAME="Your Name"
 * Optional:
 *   SEED_SAMPLE_CONTENT=false   (to skip the sample curriculum)
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import * as schema from "./schema";
import { MODULE_1, LESSONS, QUIZ_QUESTIONS, ARCADE_QUESTIONS } from "./content";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL first.");

const email = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD ?? "";
const fullName = (process.env.SUPERADMIN_NAME ?? "Super Admin").trim();
/* Content is included by default — an empty platform is almost never
   what you want. Set SEED_SAMPLE_CONTENT=false to skip it. */
const withContent = String(process.env.SEED_SAMPLE_CONTENT ?? "true").toLowerCase() !== "false";

if (!email || !password) {
  throw new Error(
    "Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in your environment before running this."
  );
}
if (password.length < 12) {
  throw new Error("Use a superadmin password of at least 12 characters.");
}

const sql = postgres(url, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

const BADGES = [
  { slug: "first-lesson", name: "First Steps", description: "Complete your first lesson.", icon: "book-open", sortOrder: 1 },
  { slug: "first-module", name: "Module Master", description: "Complete your first module.", icon: "layers", sortOrder: 2 },
  { slug: "module-x3", name: "Triple Threat", description: "Complete three modules.", icon: "layers-3", sortOrder: 3 },
  { slug: "course-complete", name: "Course Conqueror", description: "Complete every published module.", icon: "graduation-cap", sortOrder: 4 },
  { slug: "quiz-first-try", name: "First Try", description: "Pass a quiz on attempt one.", icon: "zap", sortOrder: 5 },
  { slug: "perfect-score", name: "Perfect Score", description: "Score 100% on a quiz.", icon: "target", sortOrder: 6 },
  { slug: "streak-3", name: "On Fire", description: "Learn 3 days in a row.", icon: "flame", sortOrder: 7 },
  { slug: "streak-7", name: "Unstoppable", description: "Learn 7 days in a row.", icon: "flame", sortOrder: 8 },
  { slug: "first-game", name: "Game On", description: "Finish your first arcade run.", icon: "gamepad-2", sortOrder: 9 },
  { slug: "arcade-regular", name: "Arcade Regular", description: "Finish 10 arcade runs.", icon: "joystick", sortOrder: 10 },
  { slug: "high-roller", name: "High Roller", description: "Score 900+ on Hard.", icon: "gem", sortOrder: 11 },
  { slug: "level-5", name: "Rising Star", description: "Reach level 5.", icon: "star", sortOrder: 12 },
];

async function main() {
  /* Non-destructive: this never truncates, so it is safe to run
     against a database that already has real users in it. */

  let superadminId: number;

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) {
    superadminId = existing.id;
    console.log(`A user with ${email} already exists — leaving it alone.`);
  } else {
    const [created] = await db.insert(schema.users).values({
      fullName,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "superadmin",
      status: "active",
      emailVerifiedAt: new Date(),
    }).returning({ id: schema.users.id });
    superadminId = created.id;
    console.log(`Created superadmin: ${email}`);
  }

  const [{ n }] = await db.select({ n: count() }).from(schema.badges);
  if (Number(n) === 0) {
    await db.insert(schema.badges).values(BADGES);
    console.log(`Inserted ${BADGES.length} badges.`);
  } else {
    console.log("Badges already present — skipped.");
  }

  await db.insert(schema.appSettings).values([
    { key: "registration_enabled", value: "1" },
    { key: "module_points", value: "100" },
    { key: "arcade_scoring_runs", value: "3" },
    { key: "announcement", value: "" },
  ]).onConflictDoNothing();

  /* ── optional sample curriculum ──
     Skipped entirely unless SEED_SAMPLE_CONTENT=true, and skipped
     again if any module already exists, so it can never overwrite
     content someone authored through the UI. */
  if (withContent) {
    const [{ n: moduleCount }] = await db.select({ n: count() }).from(schema.modules);

    if (Number(moduleCount) > 0) {
      console.log("Modules already exist — sample content skipped.");
    } else {
      /* Registration needs at least one course and section to pick from. */
      const [cs] = await db.insert(schema.courses)
        .values({ name: "BS Computer Science", code: "BSCS" }).returning();
      const [it] = await db.insert(schema.courses)
        .values({ name: "BS Information Technology", code: "BSIT" }).returning();
      await db.insert(schema.sections).values([
        { name: "CS-1A", courseId: cs.id },
        { name: "IT-1A", courseId: it.id },
        { name: "IT-1B", courseId: it.id },
      ]);

      const [m1] = await db.insert(schema.modules).values({
        moduleNumber: 1,
        title: MODULE_1.title,
        description: MODULE_1.description,
        isPublished: true,
        authorId: superadminId,
      }).returning();

      await db.insert(schema.lessons).values(
        LESSONS.map((l, i) => ({
          moduleId: m1.id,
          lessonOrder: i + 1,
          title: l.title,
          contentHtml: l.contentHtml,
        }))
      );

      /* Published as the admin default, so any instructor's students
         get it until that instructor writes their own. */
      const [quiz] = await db.insert(schema.quizzes).values({
        moduleId: m1.id,
        instructorId: null,
        title: `${MODULE_1.title} - Quiz`,
        passingScore: 70,
        isPublished: true,
      }).returning();

      await db.insert(schema.quizQuestions).values(
        QUIZ_QUESTIONS.map((q, i) => ({
          quizId: quiz.id,
          type: q.type ?? ("multiple_choice" as const),
          question: q.question,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC ?? null,
          optionD: q.optionD ?? null,
          correctOption: q.correctOption,
          explanation: q.explanation,
          points: 1,
          sortOrder: i + 1,
        }))
      );

      await db.insert(schema.doorQuestions).values(
        ARCADE_QUESTIONS.map((q) => ({ ...q, instructorId: null }))
      );

      const missions = [
        {
          difficulty: "easy" as const, title: "First contact",
          briefing: "Get into the device and give it a name.", time: 300,
          objectives: [
            { kind: "reach_priv" as const },
            { kind: "reach_conf" as const },
            { kind: "hostname" as const, value: "R1" },
            { kind: "saved" as const },
          ],
        },
        {
          difficulty: "medium" as const, title: "Bring up the LAN",
          briefing: "Address an interface and turn it on.", time: 300,
          objectives: [
            { kind: "hostname" as const, value: "R1" },
            { kind: "interface_ip" as const, iface: "GigabitEthernet0/1", value: "192.168.1.1", value2: "255.255.255.0" },
            { kind: "interface_up" as const, iface: "GigabitEthernet0/1" },
            { kind: "saved" as const },
          ],
        },
        {
          difficulty: "hard" as const, title: "WAN edge bring-up",
          briefing: "Full configuration: addressing, description, VTY security, banner.", time: 420,
          objectives: [
            { kind: "hostname" as const, value: "CORE-R1" },
            { kind: "interface_ip" as const, iface: "GigabitEthernet0/0", value: "10.0.0.1", value2: "255.255.255.252" },
            { kind: "interface_up" as const, iface: "GigabitEthernet0/0" },
            { kind: "interface_desc" as const, iface: "GigabitEthernet0/0", value: "WAN-LINK" },
            { kind: "vty_password" as const, value: "cisco" },
            { kind: "vty_login" as const },
            { kind: "banner" as const },
            { kind: "saved" as const },
          ],
        },
      ];

      for (const m of missions) {
        const [row] = await db.insert(schema.cliMissions).values({
          instructorId: null,
          difficulty: m.difficulty,
          title: m.title,
          briefing: m.briefing,
          timeLimitSeconds: m.time,
        }).returning();
        await db.insert(schema.cliObjectives).values(
          m.objectives.map((o, i) => ({
            missionId: row.id,
            kind: o.kind,
            iface: "iface" in o ? o.iface : null,
            value: "value" in o ? o.value : null,
            value2: "value2" in o ? o.value2 : null,
            sortOrder: i + 1,
          }))
        );
      }

      console.log(`Sample content: 1 module, ${LESSONS.length} lessons, ${QUIZ_QUESTIONS.length}-question quiz,`);
      console.log(`                ${ARCADE_QUESTIONS.length} arcade questions, ${missions.length} CLI missions, 2 courses, 3 sections.`);
    }
  }

  await db.insert(schema.auditLogs).values({
    event: "db.seeded_production",
    details: email,
  });

  console.log("\nDone. Sign in as the superadmin, then create an admin and instructors from the UI.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sql.end());
