import { eq } from "drizzle-orm";
import { User, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { db, users } from "@/db";
import { redirect } from "next/navigation";
import { PageHead, Card, CardHead, Pill } from "@/components/ui";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await db.query.users.findFirst({ where: eq(users.id, Number(session.user.id)) });
  if (!me) redirect("/login");

  return (
    <>
      <PageHead eyebrow="account" title="Settings" sub="Your details and how you sign in." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Profile" sub="How your name appears across NetQuest." />
          <div className="p-5">
            <div className="mb-5 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[rgba(0,245,160,.35)] bg-[var(--color-signal-soft)] font-[family-name:var(--font-display-src)] text-lg font-bold text-[var(--color-signal)]">
                {me.fullName.split(" ").slice(0, 2).map((w) => w[0]).join("")}
              </span>
              <div>
                <div className="font-medium">{me.fullName}</div>
                <div className="text-sm text-[var(--color-muted)]">{me.email}</div>
                <div className="mt-1.5 flex gap-1.5">
                  <Pill tone="wire">{me.role}</Pill>
                  {me.emailVerifiedAt && <Pill tone="signal">verified</Pill>}
                </div>
              </div>
            </div>
            <ProfileForm fullName={me.fullName} email={me.email} />
          </div>
        </Card>

        <Card>
          <CardHead
            title="Password"
            sub="Changing it needs a code sent to your email."
            action={<ShieldCheck size={16} className="text-[var(--color-signal)]" />}
          />
          <div className="p-5">
            <PasswordForm />
          </div>
        </Card>
      </div>
    </>
  );
}
