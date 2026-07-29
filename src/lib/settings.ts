import { eq } from "drizzle-orm";
import { db, appSettings } from "@/db";

/* Live platform settings. Every read is fail-safe: if the table is
   missing or a key isn't set, callers get the documented default
   rather than an exception. */

export const SETTING_DEFAULTS = {
  registration_enabled: "1",
  module_points: "100",
  arcade_scoring_runs: "3",
  announcement: "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(key: SettingKey): Promise<string> {
  try {
    const row = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, key),
    });
    return row?.value ?? SETTING_DEFAULTS[key];
  } catch {
    return SETTING_DEFAULTS[key];
  }
}

export async function getSettingInt(key: SettingKey, fallback: number): Promise<number> {
  const raw = await getSetting(key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAllSettings(): Promise<Record<SettingKey, string>> {
  const out = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
  try {
    for (const row of await db.select().from(appSettings)) {
      if (row.key in out) out[row.key as SettingKey] = row.value;
    }
  } catch {
    /* pre-migration — defaults stand */
  }
  return out;
}

export async function setSetting(key: SettingKey, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
