"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, users, verificationCodes, auditLogs } from "@/db";
import { auth } from "@/auth";
import { sendVerificationCode } from "@/lib/mail";

export type AccountState = {
  ok?: string;
  error?: string;
  stage?: "idle" | "code-sent";
  devCode?: string;
};

async function me() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in.");
  return { id: Number(session.user.id), email: session.user.email, role: session.user.role };
}

/* ─────────────────────────── profile ─────────────────────────── */

export async function updateProfile(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const user = await me();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (fullName.length < 2 || fullName.length > 150) {
    return { error: "Your name needs to be between 2 and 150 characters." };
  }

  await db.update(users).set({ fullName }).where(eq(users.id, user.id));
  await db.insert(auditLogs).values({
    event: "profile.updated",
    userId: user.id,
    userRole: user.role,
    details: fullName,
  });

  revalidatePath("/account");
  return { ok: "Profile updated. Your new name appears after your next sign-in." };
}

/* ──────────────── password change, verified by email code ────────────────
   Step 1 — prove the current password, then a 6-digit code goes out.
   Step 2 — the code plus the new password are submitted together.      */

export async function requestPasswordCode(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const user = await me();
  const current = String(formData.get("currentPassword") ?? "");

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row) return { error: "Account not found." };

  const ok = await bcrypt.compare(current, row.passwordHash);
  if (!ok) {
    await db.insert(auditLogs).values({
      event: "password.change_denied",
      userId: user.id,
      userRole: user.role,
      details: "wrong current password",
    });
    return { error: "That current password isn't right." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(verificationCodes).values({
    email: `pwchange:${row.email}`, // namespaced so it can't be reused for signup
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  const { delivered } = await sendVerificationCode(row.email, code);
  await db.insert(auditLogs).values({
    event: delivered ? "password.code_sent" : "password.code_send_failed",
    userId: user.id,
    userRole: user.role,
    details: row.email,
  });

  /* Say so when the send failed rather than leaving someone watching an
     empty inbox. In development the code is shown; in production the
     honest answer is to ask an admin, who can reset it directly. */
  if (!delivered) {
    return process.env.NODE_ENV !== "production"
      ? {
          stage: "code-sent",
          ok: `Email isn't configured, so the code is shown below.`,
          devCode: code,
        }
      : {
          stage: "idle",
          error:
            "We couldn't send the code — the email may be undeliverable. Ask an admin to reset your password instead.",
        };
  }

  return {
    stage: "code-sent",
    ok: `We sent a 6-digit code to ${row.email}. It expires in 15 minutes.`,
  };
}

export async function confirmPasswordChange(
  _prev: AccountState,
  formData: FormData
): Promise<AccountState> {
  const user = await me();
  const code = String(formData.get("code") ?? "").trim();
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!/^\d{6}$/.test(code)) return { stage: "code-sent", error: "The code is 6 digits." };
  if (next.length < 8) return { stage: "code-sent", error: "Use at least 8 characters." };
  if (next !== confirm) return { stage: "code-sent", error: "The two passwords don't match." };

  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!row) return { error: "Account not found." };

  const record = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.email, `pwchange:${row.email}`),
      isNull(verificationCodes.consumedAt),
      gt(verificationCodes.expiresAt, new Date())
    ),
    orderBy: (t, { desc }) => [desc(t.id)],
  });

  if (!record) return { stage: "idle", error: "That code expired. Start again." };
  if (record.attempts >= 5) return { stage: "idle", error: "Too many tries. Start again." };

  const match = await bcrypt.compare(code, record.codeHash);
  if (!match) {
    await db
      .update(verificationCodes)
      .set({ attempts: sql`${verificationCodes.attempts} + 1` })
      .where(eq(verificationCodes.id, record.id));
    return { stage: "code-sent", error: "That code doesn't match. Try again." };
  }

  await db
    .update(verificationCodes)
    .set({ consumedAt: new Date() })
    .where(eq(verificationCodes.id, record.id));
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(next, 12) })
    .where(eq(users.id, user.id));
  await db.insert(auditLogs).values({
    event: "password.changed",
    userId: user.id,
    userRole: user.role,
    details: row.email,
  });

  return { stage: "idle", ok: "Password changed. Use it the next time you sign in." };
}
