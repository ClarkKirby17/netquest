import { Suspense } from "react";
import VerifyForm from "./VerifyForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; dev?: string }>;
}) {
  const { email = "", dev } = await searchParams;
  return (
    <Suspense>
      <VerifyForm email={email} devCode={dev} />
    </Suspense>
  );
}
