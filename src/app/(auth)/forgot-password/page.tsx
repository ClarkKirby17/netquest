import Link from "next/link";
import ForgotForm from "./ForgotForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
        Forgot your password?
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Enter your email and we&apos;ll send a 6-digit code to reset it.
      </p>

      <ForgotForm />

      <p className="mt-8 border-t border-[var(--color-line)] pt-6 text-sm text-[var(--color-muted)]">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-[var(--color-signal)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
