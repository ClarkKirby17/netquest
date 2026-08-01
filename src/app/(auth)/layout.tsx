import Link from "next/link";
/* Split screen: form on the left, a live status panel on the right.
   The panel is the same visual language as the arcade — this is the
   first thing a student sees, so it should feel like the product. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[52%] lg:px-16">
        <Link href="/" className="mb-10 flex items-center gap-2.5"><span className="font-[family-name:var(--font-display-src)] text-lg font-bold tracking-tight">
            NET<span className="text-[var(--color-signal)]">QUEST</span>
          </span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* right panel — hidden on small screens */}
      <aside className="relative hidden overflow-hidden border-l border-[var(--color-line)] bg-[var(--color-deep)] lg:block lg:w-[48%]">
        <div className="flex h-full flex-col justify-center px-14">
          <span className="nq-eyebrow">link established
          </span>

          <h2 className="mt-5 font-[family-name:var(--font-display-src)] text-3xl font-bold leading-tight tracking-tight">
            Networking is a<br />
            <span className="text-[var(--color-signal)]">contact sport.</span>
          </h2>

          <p className="mt-4 max-w-sm leading-relaxed text-[var(--color-muted)]">
            Modules that unlock as you learn, quizzes that decide whether you move
            on, and an arcade where routing a packet is the game.
          </p>

          <div className="nq-term mt-10 max-w-md">
            <div className="dim">$ nq status --user you</div>
            <div className="out mt-1">
              <span className="text-[var(--color-muted)]">modules  </span>
              <span className="text-[var(--color-signal)]">unlocked as you go</span>
            </div>
            <div className="out">
              <span className="text-[var(--color-muted)]">arcade   </span>
              <span className="text-[var(--color-signal)]">3 games · 3 difficulties</span>
            </div>
            <div className="out">
              <span className="text-[var(--color-muted)]">badges   </span>
              <span className="text-[var(--color-signal)]">12 available</span>
            </div>
            <div className="out">
              <span className="text-[var(--color-muted)]">levels   </span>
              <span className="text-[var(--color-signal)]">Cable Apprentice → Network Legend</span>
            </div>
            <div className="dim mt-1 caret">ready </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
