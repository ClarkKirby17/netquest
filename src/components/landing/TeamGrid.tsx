"use client";

import Image from "next/image";
import { useState } from "react";

export type Member = { name: string; photo: string; role: string };

/* A client component purely so a missing photo can fall back to
   initials — onError only exists in the browser. */
export default function TeamGrid({ team }: { team: Member[] }) {
  return (
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {team.map((member) => (
        <TeamCard key={member.name} member={member} />
      ))}
    </div>
  );
}

function TeamCard({ member }: { member: Member }) {
  const [failed, setFailed] = useState(false);
  const initials = member.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <article className="nq-card nq-card-hover p-6 text-center">
      {failed ? (
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--color-signal)] bg-[var(--color-signal-soft)] font-[family-name:var(--font-display-src)] text-xl font-bold text-[var(--color-signal)]">
          {initials}
        </div>
      ) : (
        <Image
          src={member.photo}
          alt={member.name}
          width={80}
          height={80}
          onError={() => setFailed(true)}
          className="mx-auto h-20 w-20 rounded-full border-2 border-[var(--color-signal)] object-cover"
        />
      )}
      <h3 className="mt-4 font-semibold">{member.name}</h3>
      <p className="mt-1 font-[family-name:var(--font-mono-src)] text-[.7rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
        {member.role}
      </p>
    </article>
  );
}
