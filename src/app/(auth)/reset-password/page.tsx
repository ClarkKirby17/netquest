import { Suspense } from "react";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; dev?: string }>;
}) {
  const { email = "", dev } = await searchParams;
  return (
    <Suspense>
      <ResetForm email={email} devCode={dev} />
    </Suspense>
  );
}
