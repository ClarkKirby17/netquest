import {
  pgTable, serial, integer, varchar, text, boolean, timestamp, date,
  pgEnum, uniqueIndex, index, jsonb,
} from "drizzle-orm/pg-core";

/* ─────────────────────────── enums ─────────────────────────── */

export const roleEnum = pgEnum("role", ["student", "instructor", "admin", "superadmin"]);
export const accountStatusEnum = pgEnum("account_status", ["pending", "active", "inactive", "rejected"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false"]);
export const gameSlugEnum = pgEnum("game_slug", ["door", "packet-run", "net-cli"]);

/* ───────────────────── identity & enrolment ────────────────────
   v1 stored each role in its own table, so login had to walk four
   tables and "is this email taken" meant querying six. One users
   table with a role enum fixes both.                              */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 190 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    role: roleEnum("role").notNull().default("student"),
    status: accountStatusEnum("status").notNull().default("pending"),
    emailVerifiedAt: timestamp("email_verified_at"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    roleStatusIdx: index("users_role_status_idx").on(t.role, t.status),
  })
);

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 20 }),
});

/* A section belongs to exactly one course. v1 left these unrelated,
   which let a CS student pick an IT section.                       */
export const sections = pgTable(
  "sections",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => ({ courseIdx: index("sections_course_idx").on(t.courseId) })
);

/* Role-specific data lives beside the user, not inside it. */
export const studentProfiles = pgTable(
  "student_profiles",
  {
    userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id").notNull().references(() => courses.id),
    sectionId: integer("section_id").notNull().references(() => sections.id),
    instructorId: integer("instructor_id").references(() => users.id, { onDelete: "set null" }),
    totalPoints: integer("total_points").notNull().default(0),
    badgeCount: integer("badge_count").notNull().default(0),
  },
  (t) => ({
    instructorIdx: index("sp_instructor_idx").on(t.instructorId),
    pointsIdx: index("sp_points_idx").on(t.totalPoints),
  })
);

export const instructorProfiles = pgTable("instructor_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id").references(() => courses.id),
  sectionId: integer("section_id").references(() => sections.id),
});

/* ─────────────────────────── learning ─────────────────────────── */

export const modules = pgTable(
  "modules",
  {
    id: serial("id").primaryKey(),
    moduleNumber: integer("module_number").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    coverImage: varchar("cover_image", { length: 255 }),
    isPublished: boolean("is_published").notNull().default(false),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ orderIdx: index("modules_order_idx").on(t.moduleNumber) })
);

export const lessons = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    lessonOrder: integer("lesson_order").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    imagePath: varchar("image_path", { length: 255 }),
    /* Page breaks are authored as a line containing [[page]] */
    contentHtml: text("content_html").notNull().default(""),
  },
  (t) => ({ moduleIdx: index("lessons_module_idx").on(t.moduleId, t.lessonOrder) })
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    furthestPage: integer("furthest_page").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({ uq: uniqueIndex("lp_user_lesson_idx").on(t.userId, t.lessonId) })
);

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    /* guards double-awarding on re-entry */
    pointsAwarded: boolean("points_awarded").notNull().default(false),
  },
  (t) => ({ uq: uniqueIndex("mp_user_module_idx").on(t.userId, t.moduleId) })
);

/* ────────────────────────── assessment ─────────────────────────
   v1 had no quiz system at all. Added here.                       */

/* One quiz per module PER INSTRUCTOR. instructorId null = the admin's
   default, used as a template professors can copy and as the fallback
   students take when their own professor hasn't written one. */
export const quizzes = pgTable(
  "quizzes",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    instructorId: integer("instructor_id").references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    passingScore: integer("passing_score").notNull().default(70),
    maxAttempts: integer("max_attempts").notNull().default(0), // 0 = unlimited
    cooldownMinutes: integer("cooldown_minutes").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
  },
  (t) => ({
    uq: uniqueIndex("quizzes_module_instructor_idx").on(t.moduleId, t.instructorId),
    moduleIdx: index("quizzes_module_idx").on(t.moduleId),
  })
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull().default("multiple_choice"),
    question: text("question").notNull(),
    optionA: varchar("option_a", { length: 255 }).notNull(),
    optionB: varchar("option_b", { length: 255 }).notNull(),
    optionC: varchar("option_c", { length: 255 }),
    optionD: varchar("option_d", { length: 255 }),
    correctOption: varchar("correct_option", { length: 1 }).notNull(),
    explanation: text("explanation").notNull().default(""),
    imagePath: varchar("image_path", { length: 255 }),
    points: integer("points").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({ quizIdx: index("qq_quiz_idx").on(t.quizId) })
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull().default(1),
    score: integer("score").notNull().default(0),
    maxScore: integer("max_score").notNull().default(0),
    percent: integer("percent").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    answers: jsonb("answers").$type<Record<string, string>>(),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  },
  (t) => ({ userQuizIdx: index("qa_user_quiz_idx").on(t.userId, t.quizId) })
);

/* ───────────────────────── gamification ───────────────────────── */

export const gamification = pgTable("gamification", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastActivityDate: date("last_activity_date"),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default("award"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: integer("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (t) => ({ uq: uniqueIndex("ub_user_badge_idx").on(t.userId, t.badgeId) })
);

/* Three games: door · packet-run · net-cli */
export const gameScores = pgTable(
  "game_scores",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    gameSlug: gameSlugEnum("game_slug").notNull(),
    difficulty: difficultyEnum("difficulty").notNull().default("easy"),
    score: integer("score").notNull().default(0),
    pointsEarned: integer("points_earned").notNull().default(0),
    playedAt: timestamp("played_at").notNull().defaultNow(),
  },
  (t) => ({ userGameIdx: index("gs_user_game_idx").on(t.userId, t.gameSlug, t.playedAt) })
);

/* Arcade question pool. instructorId null = global pool maintained by
   admin; a professor's own questions LAYER on top of it rather than
   replacing it, so an arcade is never empty. */
export const doorQuestions = pgTable(
  "door_questions",
  {
    id: serial("id").primaryKey(),
    instructorId: integer("instructor_id").references(() => users.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    optionA: varchar("option_a", { length: 255 }).notNull(),
    optionB: varchar("option_b", { length: 255 }).notNull(),
    optionC: varchar("option_c", { length: 255 }).notNull(),
    correctOption: varchar("correct_option", { length: 1 }).notNull(),
    explanation: text("explanation").notNull().default(""),
    difficulty: difficultyEnum("difficulty").notNull().default("easy"),
    active: boolean("active").notNull().default(true),
  },
  (t) => ({
    diffIdx: index("dq_difficulty_idx").on(t.difficulty, t.active),
    instructorIdx: index("dq_instructor_idx").on(t.instructorId),
  })
);


/* ─────────────────────── Net CLI missions ───────────────────────
   Objectives are declarative {kind, target} rows rather than stored
   code — the game has a small evaluator per kind, so professors can
   compose missions safely without anyone executing arbitrary logic. */

export const cliObjectiveKindEnum = pgEnum("cli_objective_kind", [
  "reach_priv",      // enter privileged EXEC
  "reach_conf",      // enter global config
  "hostname",        // value = required hostname
  "interface_ip",    // iface + value (ip) + value2 (mask)
  "interface_up",    // iface
  "interface_desc",  // iface + value
  "vty_password",    // value
  "vty_login",
  "banner",
  "saved",
]);

export const cliMissions = pgTable(
  "cli_missions",
  {
    id: serial("id").primaryKey(),
    instructorId: integer("instructor_id").references(() => users.id, { onDelete: "cascade" }),
    difficulty: difficultyEnum("difficulty").notNull().default("easy"),
    title: varchar("title", { length: 160 }).notNull(),
    briefing: text("briefing").notNull().default(""),
    timeLimitSeconds: integer("time_limit_seconds").notNull().default(300),
    active: boolean("active").notNull().default(true),
  },
  (t) => ({
    lookupIdx: index("cli_missions_lookup_idx").on(t.difficulty, t.active),
    instructorIdx: index("cli_missions_instructor_idx").on(t.instructorId),
  })
);

export const cliObjectives = pgTable(
  "cli_objectives",
  {
    id: serial("id").primaryKey(),
    missionId: integer("mission_id").notNull().references(() => cliMissions.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    kind: cliObjectiveKindEnum("kind").notNull(),
    iface: varchar("iface", { length: 40 }),
    value: varchar("value", { length: 120 }),
    value2: varchar("value2", { length: 120 }),
  },
  (t) => ({ missionIdx: index("cli_objectives_mission_idx").on(t.missionId, t.sortOrder) })
);

export type CliMission = typeof cliMissions.$inferSelect;
export type CliObjective = typeof cliObjectives.$inferSelect;
export type CliObjectiveKind = (typeof cliObjectiveKindEnum.enumValues)[number];

/* ─────────────────────────── platform ─────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body").notNull().default(""),
    link: varchar("link", { length: 255 }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ userIdx: index("notif_user_idx").on(t.userId, t.isRead) })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    event: varchar("event", { length: 80 }).notNull(),
    userId: integer("user_id"),
    userRole: varchar("user_role", { length: 20 }),
    details: varchar("details", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ createdIdx: index("audit_created_idx").on(t.createdAt) })
);

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: varchar("value", { length: 1000 }).notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 190 }).notNull(),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
  },
  (t) => ({ emailIdx: index("vc_email_idx").on(t.email) })
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 190 }).notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
  },
  (t) => ({ emailIdx: index("pr_email_idx").on(t.email) })
);

/* ──────────────────────────── types ──────────────────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type GameSlug = (typeof gameSlugEnum.enumValues)[number];
export type Difficulty = (typeof difficultyEnum.enumValues)[number];
