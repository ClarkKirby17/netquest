import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/db/schema";

/* Layouts guard pages; every server ACTION must guard itself too —
   a request can hit an action without ever rendering the page. */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user || !roles.includes(session.user.role)) {
    redirect("/login");
  }
  return { userId: Number(session.user.id), role: session.user.role, name: session.user.name };
}
