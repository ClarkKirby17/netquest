"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import {
  db, users, studentProfiles, instructorProfiles, sections,
  verificationCodes, auditLogs, gamification,
} from "@/db";
import { loginSchema, registerSchema, verifySchema } from "@/lib/validations";
import { sendVerificationCode } from "@/lib/mail";
import { HOME_FOR } from "@/lib/roles";
import { getSetting } from "@/lib/settings";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  devCode?: string; // shown on the verify page in dev when mail isn't configured
};

/* ────────────────────────────── register ────────────────────────────── */

export async function registerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  /* The page redirects when registration is closed; the action
     re-checks so a direct POST can't slip past it. */
  if ((await getSetting("registration_enabled")) === "0") {
    return { error: "Registration is closed right now. Contact your instructor." };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    }
    return { fieldErrors };
  }
  const data = parsed.data;

  // One email across every role — the win of the single users table.
  const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
  if (existing) {
    return { fieldErrors: { email: "That email is already registered." } };
  }

  // The section must belong to the chosen course (the v1 bug, enforced server-side).
  const section = await db.query.sections.findFirst({ where: eq(sections.id, data.sectionId) });
  if (!section || section.courseId !== data.courseId) {
    return { fieldErrors: { sectionId: "That section belongs to a different course." } };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: data.role,
      status: "pending",
    })
    .returning({ id: users.id });

  if (data.role === "student") {
    await db.insert(studentProfiles).values({
      userId: user.id,
      courseId: data.courseId,
      sectionId: data.sectionId,
      instructorId: data.instructorId!,
    });
    await db.insert(gamification).values({ userId: user.id }).onConflictDoNothing();
  } else {
    await db.insert(instructorProfiles).values({
      userId: user.id,
      courseId: data.courseId,
      sectionId: data.sectionId,
    });
  }

  await db.insert(auditLogs).values({
    event: "user.registered",
    userId: user.id,
    userRole: data.role,
    details: data.email,
  });

  const devCode = await issueCode(data.email);
  redirect(`/verify?email=${encodeURIComponent(data.email)}${devCode ? `&dev=${devCode}` : ""}`);
}

/* ─────────────────────────────── verify ─────────────────────────────── */

export async function verifyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter the 6-digit code from your email." };
  }
  const { email, code } = parsed.data;

  const record = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.email, email),
      isNull(verificationCodes.consumedAt),
      gt(verificationCodes.expiresAt, new Date())
    ),
    orderBy: (t, { desc }) => [desc(t.id)],
  });

  if (!record) {
    return { error: "That code expired. Request a new one below." };
  }
  if (record.attempts >= 5) {
    return { error: "Too many tries for this code. Request a new one below." };
  }

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    await db
      .update(verificationCodes)
      .set({ attempts: sql`${verificationCodes.attempts} + 1` })
      .where(eq(verificationCodes.id, record.id));
    return { error: "That code doesn't match. Check the email and try again." };
  }

  await db
    .update(verificationCodes)
    .set({ consumedAt: new Date() })
    .where(eq(verificationCodes.id, record.id));
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.email, email));
  await db.insert(auditLogs).values({ event: "email.verified", details: email });

  redirect("/pending");
}

export async function resendCodeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email) return { error: "Missing email." };

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || user.emailVerifiedAt) {
    // Don't reveal which emails exist.
    return { error: "If that address needs a code, a new one was sent." };
  }

  const devCode = await issueCode(email);
  return devCode
    ? { devCode, error: undefined }
    : { error: undefined };
}

/* ─────────────────────────────── login ──────────────────────────────── */

export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }
  const { email, password } = parsed.data;

  // Throttle: 5 failed attempts per email in 15 minutes.
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const failures = await db
    .select({ n: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.event, "login.failed"),
        eq(auditLogs.details, email),
        gt(auditLogs.createdAt, since)
      )
    );
  if (Number(failures[0]?.n ?? 0) >= 5) {
    return { error: "Too many attempts. Wait 15 minutes and try again." };
  }

  // Friendly pre-checks so failures explain themselves.
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (user && !user.emailVerifiedAt) {
    const devCode = await issueCode(email);
    redirect(`/verify?email=${encodeURIComponent(email)}${devCode ? `&dev=${devCode}` : ""}`);
  }
  if (user && user.status === "pending") {
    return { error: "Your account is waiting for approval. You'll be notified when it's ready." };
  }
  if (user && (user.status === "inactive" || user.status === "rejected")) {
    return { error: "This account is not active. Contact your instructor or admin." };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) {
      await db.insert(auditLogs).values({ event: "login.failed", details: email });
      return { error: "Wrong email or password." };
    }
    throw e;
  }

  await db.insert(auditLogs).values({
    event: "login.success",
    userId: user?.id,
    userRole: user?.role,
    details: email,
  });
  redirect(user ? HOME_FOR[user.role] : "/login");
}

/* ────────────────────────────── helpers ─────────────────────────────── */

/** Create + store + send a 6-digit code. Returns the code only in dev
    when no mail provider is configured, so the UI can display it. */
async function issueCode(email: string): Promise<string | null> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(verificationCodes).values({
    email,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  const { delivered } = await sendVerificationCode(email, code);
  const dev = !delivered && process.env.NODE_ENV !== "production";
  return dev ? code : null;
}
