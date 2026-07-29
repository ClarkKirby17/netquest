import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { and, count, eq } from "drizzle-orm";
import { db, notifications } from "@/db";
import AppShell from "@/components/app/AppShell";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "instructor") redirect("/login");

  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, Number(session.user.id)),
        eq(notifications.isRead, false)
      )
    );

  return (
    <AppShell
      role="instructor"
      name={session.user.name}
      email={session.user.email}
      unread={Number(row?.n ?? 0)}
    >
      {children}
    </AppShell>
  );
}
