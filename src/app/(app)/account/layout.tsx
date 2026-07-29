import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, notifications } from "@/db";
import AppShell from "@/components/app/AppShell";

/* Account is shared by all four roles, so the shell takes whichever
   role the session carries. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, Number(session.user.id)), eq(notifications.isRead, false))
    );

  return (
    <AppShell
      role={session.user.role}
      name={session.user.name}
      email={session.user.email}
      unread={Number(row?.n ?? 0)}
    >
      {children}
    </AppShell>
  );
}
