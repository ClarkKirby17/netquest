/* Seed data for local testing: courses, sections, one account per
   role (all active + verified), badges, and door questions.
   Run: npm run db:seed              Password everywhere: Password123 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { MODULE_1, LESSONS, QUIZ_QUESTIONS, ARCADE_QUESTIONS } from "./content";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL in .env first.");

const sql = postgres(url, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

/* Every table this script writes to. TRUNCATE ... CASCADE clears them
   in one statement regardless of foreign-key order, and RESTART
   IDENTITY resets the id sequences so ids stay predictable. */
const SEEDED_TABLES = [
  "users", "courses", "sections", "student_profiles", "instructor_profiles",
  "modules", "lessons", "lesson_progress", "module_progress",
  "quizzes", "quiz_questions", "quiz_attempts",
  "gamification", "badges", "user_badges", "game_scores", "door_questions",
  "cli_missions", "cli_objectives",
  "notifications", "audit_logs", "app_settings",
  "verification_codes", "password_resets",
];

async function reset() {
  const list = SEEDED_TABLES.map((t) => `"${t}"`).join(", ");
  await sql.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  console.log("Cleared existing data.");
}

async function main() {
  /* Seeding is destructive by design — it rebuilds a known-good
     dataset, so running it twice is safe. */
  await reset();

  const now = new Date();
  const hash = await bcrypt.hash("Password123", 12);

  /* courses + sections (sections belong to a course) */
  const [cs] = await db.insert(schema.courses).values({ name: "BS Computer Science", code: "BSCS" }).returning();
  const [it] = await db.insert(schema.courses).values({ name: "BS Information Technology", code: "BSIT" }).returning();
  const [cs1a] = await db.insert(schema.sections).values({ name: "CS-1A", courseId: cs.id }).returning();
  const [it1a] = await db.insert(schema.sections).values({ name: "IT-1A", courseId: it.id }).returning();
  await db.insert(schema.sections).values({ name: "IT-1B", courseId: it.id });

  /* one account per role — active + verified so login works immediately */
  const mk = (fullName: string, email: string, role: schema.Role) =>
    ({ fullName, email, role, passwordHash: hash, status: "active" as const, emailVerifiedAt: now });

  const [root] = await db.insert(schema.users).values(mk("Root Operator", "super@netquest.test", "superadmin")).returning();
  const [admin] = await db.insert(schema.users).values(mk("Clark Admin", "admin@netquest.test", "admin")).returning();
  const [jed] = await db.insert(schema.users).values(mk("Jed Mirabueno", "instructor@netquest.test", "instructor")).returning();
  const [juan] = await db.insert(schema.users).values(mk("Juan Dela Cruz", "student@netquest.test", "student")).returning();

  await db.insert(schema.instructorProfiles).values({ userId: jed.id, courseId: it.id, sectionId: it1a.id });
  await db.insert(schema.studentProfiles).values({
    userId: juan.id, courseId: it.id, sectionId: it1a.id, instructorId: jed.id, totalPoints: 120,
  });
  await db.insert(schema.gamification).values({ userId: juan.id, xp: 180, level: 2, streakDays: 3, bestStreak: 5 });

  /* ── curriculum: one published module with three paginated lessons ── */
  const [m1] = await db.insert(schema.modules).values({
    moduleNumber: 1,
    title: MODULE_1.title,
    description: MODULE_1.description,
    isPublished: true,
    authorId: admin.id,
  }).returning();

  await db.insert(schema.lessons).values(
    LESSONS.map((l, i) => ({
      moduleId: m1.id,
      lessonOrder: i + 1,
      title: l.title,
      contentHtml: l.contentHtml,
    }))
  );

  /* A second module, drafted but unpublished — so the admin release
     switch has something to demonstrate. */
  await db.insert(schema.modules).values({
    moduleNumber: 2,
    title: "Basic Network Devices",
    description: "Switches, routers, and access points in depth — what each one decides and how.",
    isPublished: false,
    authorId: admin.id,
  });

  /* badges */
  await db.insert(schema.badges).values([
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
  ]);

  /* ── quizzes ──
     Jed gets the full ten-question quiz for his own students; a
     shorter admin default sits behind it as the fallback for any
     instructor who has not written one. */
  const [jedQuiz] = await db.insert(schema.quizzes).values({
    moduleId: m1.id,
    instructorId: jed.id,
    title: "Networking Today - Quiz",
    passingScore: 70,
    maxAttempts: 0,
    cooldownMinutes: 0,
    isPublished: true,
  }).returning();

  await db.insert(schema.quizQuestions).values(
    QUIZ_QUESTIONS.map((q, i) => ({
      quizId: jedQuiz.id,
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

  const [defaultQuiz] = await db.insert(schema.quizzes).values({
    moduleId: m1.id,
    instructorId: null,
    title: "Networking Today - Standard Quiz",
    passingScore: 70,
    isPublished: true,
  }).returning();

  await db.insert(schema.quizQuestions).values(
    QUIZ_QUESTIONS.slice(0, 4).map((q, i) => ({
      quizId: defaultQuiz.id,
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

  /* ── arcade question pool ──
     Most sit in the global pool; two are Jed's own, so the layering
     is visible: his students see both sets, everyone else sees only
     the global ones. */
  await db.insert(schema.doorQuestions).values(
    ARCADE_QUESTIONS.map((q) => ({ ...q, instructorId: null }))
  );

  await db.insert(schema.doorQuestions).values([
    {
      instructorId: jed.id,
      question: "In our lab, which interface is the uplink to the core switch?",
      optionA: "GigabitEthernet0/0", optionB: "GigabitEthernet0/1", optionC: "GigabitEthernet0/2",
      correctOption: "A",
      explanation: "Gi0/0 is the uplink in the lab topology we use in class.",
      difficulty: "easy" as const,
    },
    {
      instructorId: jed.id,
      question: "Which subnet mask did we agree on for the campus LAN?",
      optionA: "255.255.0.0", optionB: "255.255.255.0", optionC: "255.255.255.252",
      correctOption: "B",
      explanation: "A /24 gives 254 usable hosts, which covers the campus LAN comfortably.",
      difficulty: "medium" as const,
    },
  ]);

  /* global CLI missions — the fallback every student can play */
  const [easyM] = await db.insert(schema.cliMissions).values({
    instructorId: null, difficulty: "easy", title: "First contact",
    briefing: "Get into the device and give it a name.", timeLimitSeconds: 300,
  }).returning();
  await db.insert(schema.cliObjectives).values([
    { missionId: easyM.id, kind: "reach_priv", sortOrder: 1 },
    { missionId: easyM.id, kind: "reach_conf", sortOrder: 2 },
    { missionId: easyM.id, kind: "hostname", value: "R1", sortOrder: 3 },
    { missionId: easyM.id, kind: "saved", sortOrder: 4 },
  ]);

  const [medM] = await db.insert(schema.cliMissions).values({
    instructorId: null, difficulty: "medium", title: "Bring up the LAN",
    briefing: "Address an interface and turn it on.", timeLimitSeconds: 300,
  }).returning();
  await db.insert(schema.cliObjectives).values([
    { missionId: medM.id, kind: "hostname", value: "R1", sortOrder: 1 },
    { missionId: medM.id, kind: "interface_ip", iface: "GigabitEthernet0/1",
      value: "192.168.1.1", value2: "255.255.255.0", sortOrder: 2 },
    { missionId: medM.id, kind: "interface_up", iface: "GigabitEthernet0/1", sortOrder: 3 },
    { missionId: medM.id, kind: "saved", sortOrder: 4 },
  ]);

  const [hardM] = await db.insert(schema.cliMissions).values({
    instructorId: null, difficulty: "hard", title: "WAN edge bring-up",
    briefing: "Full configuration: addressing, description, VTY security, banner.",
    timeLimitSeconds: 420,
  }).returning();
  await db.insert(schema.cliObjectives).values([
    { missionId: hardM.id, kind: "hostname", value: "CORE-R1", sortOrder: 1 },
    { missionId: hardM.id, kind: "interface_ip", iface: "GigabitEthernet0/0",
      value: "10.0.0.1", value2: "255.255.255.252", sortOrder: 2 },
    { missionId: hardM.id, kind: "interface_up", iface: "GigabitEthernet0/0", sortOrder: 3 },
    { missionId: hardM.id, kind: "interface_desc", iface: "GigabitEthernet0/0",
      value: "WAN-LINK", sortOrder: 4 },
    { missionId: hardM.id, kind: "vty_password", value: "cisco", sortOrder: 5 },
    { missionId: hardM.id, kind: "vty_login", sortOrder: 6 },
    { missionId: hardM.id, kind: "banner", sortOrder: 7 },
    { missionId: hardM.id, kind: "saved", sortOrder: 8 },
  ]);

  /* Jed's own mission — takes priority over the global one for his students. */
  const [jedMission] = await db.insert(schema.cliMissions).values({
    instructorId: jed.id,
    difficulty: "medium",
    title: "Bring up the campus LAN",
    briefing:
      "The switch closet is wired but nothing is configured. Name the device, address the LAN interface, and save your work.",
    timeLimitSeconds: 300,
  }).returning();
  await db.insert(schema.cliObjectives).values([
    { missionId: jedMission.id, kind: "reach_priv", sortOrder: 1 },
    { missionId: jedMission.id, kind: "hostname", value: "CAMPUS-R1", sortOrder: 2 },
    { missionId: jedMission.id, kind: "interface_ip", iface: "GigabitEthernet0/1",
      value: "192.168.10.1", value2: "255.255.255.0", sortOrder: 3 },
    { missionId: jedMission.id, kind: "interface_up", iface: "GigabitEthernet0/1", sortOrder: 4 },
    { missionId: jedMission.id, kind: "saved", sortOrder: 5 },
  ]);

  /* settings */
  await db.insert(schema.appSettings).values([
    { key: "registration_enabled", value: "1" },
    { key: "module_points", value: "100" },
    { key: "arcade_scoring_runs", value: "3" },
    { key: "announcement", value: "" },
  ]);

  await db.insert(schema.auditLogs).values({ event: "db.seeded", details: "seed script" });

  console.log("\nSeeded (existing data was cleared first).");
  console.log(`  ${LESSONS.length} lessons in "${MODULE_1.title}" (published)`);
  console.log("  1 draft module for the release switch");
  console.log(`  ${QUIZ_QUESTIONS.length}-question quiz for Jed + a 4-question admin default`);
  console.log(`  ${ARCADE_QUESTIONS.length} global arcade questions + 2 of Jed's`);
  console.log("  4 CLI missions (3 global, 1 Jed's)\n");
  console.log("Test accounts (password: Password123):");
  console.log("  super@netquest.test       superadmin");
  console.log("  admin@netquest.test       admin");
  console.log("  instructor@netquest.test  instructor");
  console.log("  student@netquest.test     student\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => sql.end());
