"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, count, eq, lt, sql } from "drizzle-orm";
import {
  db, users, auditLogs, notifications, verificationCodes, passwordResets,
} from "@/db";
import { requireRole } from "@/lib/guard";
import { setSetting, type SettingKey } from "@/lib/settings";

export type SuperState = { ok?: string; error?: string; tempPassword?: string };

/* ───────────────────── admin accounts ─────────────────────
   Only superadmin reaches these. Guards stop the platform being
   locked out: you can't remove the last active admin, and you can't
   deactivate or delete yourself. */

async function activeAdminCount() {
  const [{ n }] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")));
  return Number(n);
}

export async function createAdmin(
  _prev: SuperState,
  formData: FormData
): Promise<SuperState> {
  const me = await requireRole("superadmin");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2) return { error: "Enter the admin's full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Use at least 8 characters." };

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { error: "That email is already registered." };

  await db.insert(users).values({
    fullName,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    status: "active",
    /* Created by a human who already verified them — no email loop. */
    emailVerifiedAt: new Date(),
  });

  await db.insert(auditLogs).values({
    event: "admin.created", userId: me.userId, userRole: "superadmin", details: email,
  });

  revalidatePath("/superadmin/admins");
  return { ok: `${fullName} can now sign in with that password.` };
}

export async function setAdminStatus(formData: FormData) {
  const me = await requireRole("superadmin");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !["active", "inactive"].includes(status)) return;
  if (id === me.userId) return; // never lock yourself out

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target || target.role !== "admin") return;

  if (status === "inactive" && target.status === "active" && (await activeAdminCount()) <= 1) {
    return; // last active admin stays
  }

  await db.update(users).set({ status: status as "active" | "inactive" }).where(eq(users.id, id));
  await db.insert(auditLogs).values({
    event: `admin.${status}`, userId: me.userId, userRole: "superadmin", details: target.email,
  });
  revalidatePath("/superadmin/admins");
}

export async function resetAdminPassword(
  _prev: SuperState,
  formData: FormData
): Promise<SuperState> {
  const me = await requireRole("superadmin");
  const id = Number(formData.get("id"));
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target || target.role !== "admin") return { error: "Admin not found." };

  const temp = "NQ-" + Math.random().toString(36).slice(2, 10);
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(temp, 12) })
    .where(eq(users.id, id));

  await db.insert(notifications).values({
    userId: id,
    title: "Your password was reset",
    body: "A super admin issued you a temporary password. Change it in Account settings.",
    link: "/account",
  });
  await db.insert(auditLogs).values({
    event: "admin.password_reset", userId: me.userId, userRole: "superadmin", details: target.email,
  });

  revalidatePath("/superadmin/admins");
  return {
    ok: `Temporary password for ${target.fullName}:`,
    tempPassword: temp,
  };
}

export async function deleteAdmin(formData: FormData) {
  const me = await requireRole("superadmin");
  const id = Number(formData.get("id"));
  if (!id || id === me.userId) return;

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target || target.role !== "admin") return;
  if (target.status === "active" && (await activeAdminCount()) <= 1) return;

  await db.delete(users).where(eq(users.id, id));
  await db.insert(auditLogs).values({
    event: "admin.deleted", userId: me.userId, userRole: "superadmin", details: target.email,
  });
  revalidatePath("/superadmin/admins");
}

/* ───────────────────── system settings ───────────────────── */

export async function saveSettings(
  _prev: SuperState,
  formData: FormData
): Promise<SuperState> {
  const me = await requireRole("superadmin");

  const modulePoints = Number(formData.get("module_points") || 100);
  const arcadeRuns = Number(formData.get("arcade_scoring_runs") || 3);

  if (modulePoints < 0 || modulePoints > 10000) {
    return { error: "Module points must be between 0 and 10000." };
  }
  if (arcadeRuns < 0 || arcadeRuns > 50) {
    return { error: "Arcade scoring runs must be between 0 and 50." };
  }

  const pairs: [SettingKey, string][] = [
    ["registration_enabled", formData.get("registration_enabled") ? "1" : "0"],
    ["module_points", String(Math.round(modulePoints))],
    ["arcade_scoring_runs", String(Math.round(arcadeRuns))],
    ["announcement", String(formData.get("announcement") ?? "").trim().slice(0, 500)],
  ];
  for (const [k, v] of pairs) await setSetting(k, v);

  await db.insert(auditLogs).values({
    event: "settings.updated", userId: me.userId, userRole: "superadmin",
  });

  revalidatePath("/superadmin/settings");
  revalidatePath("/login");
  revalidatePath("/register");
  return { ok: "Saved — the changes are live immediately." };
}

/* ───────────────────── maintenance ───────────────────── */

const PURGES = {
  codes: {
    label: "expired verification codes",
    run: () => db.delete(verificationCodes).where(lt(verificationCodes.expiresAt, new Date())),
  },
  resets: {
    label: "expired password-reset tokens",
    run: () => db.delete(passwordResets).where(lt(passwordResets.expiresAt, new Date())),
  },
  notifications: {
    label: "read notifications older than 30 days",
    run: () =>
      db.delete(notifications).where(
        and(
          eq(notifications.isRead, true),
          lt(notifications.createdAt, new Date(Date.now() - 30 * 86_400_000))
        )
      ),
  },
  audits: {
    label: "audit entries older than 90 days",
    run: () =>
      db.delete(auditLogs).where(lt(auditLogs.createdAt, new Date(Date.now() - 90 * 86_400_000))),
  },
} as const;

export type PurgeKey = keyof typeof PURGES;

export async function runPurge(formData: FormData) {
  const me = await requireRole("superadmin");
  const key = String(formData.get("key")) as PurgeKey;
  if (!(key in PURGES)) return;

  await PURGES[key].run();
  await db.insert(auditLogs).values({
    event: "maintenance.purge", userId: me.userId, userRole: "superadmin", details: key,
  });
  revalidatePath("/superadmin/maintenance");
}
