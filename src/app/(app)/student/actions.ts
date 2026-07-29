"use server";

import { revalidatePath } from "next/cache";
import { completePage } from "@/lib/learning";
import { requireRole } from "@/lib/guard";

/** Called by the reader when a page scrolls into completion. */
export async function markPageRead(lessonId: number, pageIndex: number) {
  const me = await requireRole("student");
  const result = await completePage(me.userId, lessonId, pageIndex);
  if (result.ok && result.lessonCompleted) {
    revalidatePath("/student/modules");
    revalidatePath("/student");
  }
  return result;
}
