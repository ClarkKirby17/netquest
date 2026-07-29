"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Settings, Award, LogOut, ChevronDown, LayoutDashboard } from "lucide-react";
import { ROLE_LABEL } from "@/lib/nav";
import { HOME_FOR } from "@/lib/roles";
import type { Role } from "@/db/schema";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth-actions";

export default function ProfileMenu({ role, name, email }: { role: Role; name: string; email?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("");

  /* Close on outside click and on Escape. */
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { label: "Dashboard", href: HOME_FOR[role], icon: LayoutDashboard },
    ...(role === "student"
      ? [{ label: "Achievements", href: "/student/achievements", icon: Award }]
      : []),
    { label: "Account settings", href: "/account", icon: Settings },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors duration-150",
          open ? "bg-[rgba(255,255,255,.06)]" : "hover:bg-[rgba(255,255,255,.04)]"
        )}
      >
        <span className="hidden text-right sm:block">
          <span className="block text-sm font-medium leading-tight">{name}</span>
          <span className="block font-[family-name:var(--font-mono-src)] text-[.62rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
            {ROLE_LABEL[role]}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] font-[family-name:var(--font-display-src)] text-xs font-bold text-[var(--color-signal)]">
          {initials}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-[var(--color-muted)] transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-[12px] border border-[var(--color-line)] bg-[var(--color-raised)] shadow-2xl"
        >
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <div className="truncate text-sm font-medium">{name}</div>
            {email && (
              <div className="truncate font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                {email}
              </div>
            )}
          </div>

          <div className="p-1.5">
            {items.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[rgba(255,255,255,.05)] hover:text-[var(--color-text)]"
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          <div className="border-t border-[var(--color-line)] p-1.5">
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm text-[var(--color-muted)] transition-colors hover:bg-[rgba(255,77,109,.1)] hover:text-[var(--color-alert)]"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
