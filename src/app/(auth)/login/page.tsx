import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getSetting } from "@/lib/settings";
import LoginForm from "./LoginForm";

/* The announcement banner and the registration toggle are live settings,
   so this page must be rendered per request. */
export const dynamic = "force-dynamic";

/* ONE login for every role. The account's role decides where you
   land — there is no separate admin URL. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ closed?: string }>;
}) {
  const { closed } = await searchParams;
  const [announcement, registrationOpen] = await Promise.all([
    getSetting("announcement"),
    getSetting("registration_enabled"),
  ]);

  return (
    <>
      {announcement && (
        <div className="mb-6 flex items-start gap-3 rounded-[10px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-4 py-3">
          <Megaphone size={16} className="mt-0.5 shrink-0 text-[var(--color-warn)]" />
          <p className="text-sm text-[var(--color-text)]">{announcement}</p>
        </div>
      )}
      {closed && (
        <div className="mb-6 rounded-[10px] border border-[var(--color-line)] px-4 py-3 text-sm text-[var(--color-muted)]">
          Registration is closed at the moment. Contact your instructor if you need an account.
        </div>
      )}
      <h1 className="font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Students, instructors, and staff all sign in here.
      </p>

      <LoginForm />

      {registrationOpen === "1" && (
        <p className="mt-8 border-t border-[var(--color-line)] pt-6 text-sm text-[var(--color-muted)]">
          New here?{" "}
          <Link href="/register" className="font-medium text-[var(--color-signal)] hover:underline">
            Create an account
          </Link>
        </p>
      )}
    </>
  );
}
