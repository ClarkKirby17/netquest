"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/guard";
import {
  submitRun, doorQuestionsFor, isGameSlug, isDifficulty,
} from "@/lib/arcade";
import type { Difficulty } from "@/db/schema";
import { missionFor } from "@/lib/cli-missions";

export async function loadDoorQuestions(difficulty: string) {
  const me = await requireRole("student");
  if (!isDifficulty(difficulty)) return [];
  return doorQuestionsFor(me.userId, difficulty, 10);
}

export async function recordRun(slug: string, difficulty: string, score: number) {
  const me = await requireRole("student");
  if (!isGameSlug(slug) || !isDifficulty(difficulty)) {
    throw new Error("Unknown game or difficulty.");
  }
  const result = await submitRun(me.userId, slug, difficulty as Difficulty, score);
  revalidatePath("/student/arcade");
  revalidatePath("/student");
  revalidatePath("/student/leaderboard");
  return result;
}

export async function loadCliMission(difficulty: string) {
  const me = await requireRole("student");
  if (!isDifficulty(difficulty)) return null;
  return missionFor(me.userId, difficulty);
}
