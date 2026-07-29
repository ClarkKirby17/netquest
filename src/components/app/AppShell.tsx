"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Menu, X, LogOut, Bell, PanelLeftClose, PanelLeftOpen, Loader2 } from "lucide-react";
import { NAV, ROLE_LABEL } from "@/lib/nav";
import type { Role } from "@/db/schema";
import { Led } from "@/components/ui";
import ProfileMenu from "./ProfileMenu";
import { signOutAction } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nq:sidebar-collapsed";

export default function AppShell({
  role,
  name,
  email,
  children,
  unread = 0,
}: {
  role: Role;
  name: string;
  email?: string;
  children: React.ReactNode;
  unread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  /* Navigation runs through a transition so a slow server render shows
     a spinner on the item being opened instead of a dead sidebar. */
  const [navigating, startNavigation] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  /* Restore the saved preference. `ready` gates the width transition
     so the sidebar doesn't visibly snap on first paint. */
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage unavailable — stay expanded */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setTarget(null);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const items = NAV[role];
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("");

  /* Exactly one item is active. The portal root ("/instructor") is a
     prefix of every child route, so a plain startsWith lights up both
     Dashboard and the real page — longest match wins instead. */
  const activeHref = items
    .filter(({ href }) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  /* mini = icon-only. The mobile drawer always passes false. */
  const SidebarBody = ({ mini }: { mini: boolean }) => (
    <>
      <div className={cn("flex h-16 items-center", mini ? "justify-center px-0" : "px-5")}>
        <Link href="/" className="flex items-center gap-2.5" title="NetQuest">
          <Led state="live" />
          {!mini && (
            <span className="whitespace-nowrap font-[family-name:var(--font-display-src)] text-lg font-bold tracking-tight">
              NET<span className="text-[var(--color-signal)]">QUEST</span>
            </span>
          )}
        </Link>
      </div>

      {!mini && (
        <div className="px-5 pb-4">
          <span className="font-[family-name:var(--font-mono-src)] text-[.62rem] uppercase tracking-[.18em] text-[var(--color-muted)]">
            {ROLE_LABEL[role]} portal
          </span>
        </div>
      )}

      <nav className={cn("flex-1 space-y-0.5 pb-4", mini ? "px-2" : "px-3")}>
        {items.map(({ label, href, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                setDrawerOpen(false);
                if (href === pathname) return;
                setTarget(href);
                startNavigation(() => router.push(href));
              }}
              title={mini ? label : undefined}
              aria-label={mini ? label : undefined}
              aria-busy={navigating && target === href}
              className={cn(
                "group relative flex items-center rounded-[10px] text-sm transition-colors duration-150",
                mini ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-[var(--color-signal-soft)] font-medium text-[var(--color-signal)]"
                  : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,.04)] hover:text-[var(--color-text)]",
                navigating && target !== href && "opacity-50"
              )}
            >
              {navigating && target === href ? (
                <Loader2 size={17} className="shrink-0 animate-spin" />
              ) : (
                <Icon size={17} className="shrink-0" />
              )}
              {!mini && <span className="whitespace-nowrap">{label}</span>}
              {!mini && active && !navigating && <Led state="done" className="ml-auto" />}

              {mini && (
                <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md border border-[var(--color-line)] bg-[var(--color-raised)] px-2.5 py-1.5 text-xs text-[var(--color-text)] shadow-lg group-hover:block">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-[var(--color-line)]", mini ? "p-2" : "p-3")}>
        <form action={signOutAction}>
          <button
            type="submit"
            title={mini ? "Sign out" : undefined}
            className={cn(
              "group relative flex w-full items-center rounded-[10px] text-sm text-[var(--color-muted)] transition-colors hover:bg-[rgba(255,77,109,.08)] hover:text-[var(--color-alert)]",
              mini ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
            )}
          >
            <LogOut size={17} className="shrink-0" />
            {!mini && "Sign out"}
            {mini && (
              <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md border border-[var(--color-line)] bg-[var(--color-raised)] px-2.5 py-1.5 text-xs shadow-lg group-hover:block">
                Sign out
              </span>
            )}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-deep)] lg:flex",
          ready && "transition-[width] duration-200 ease-out",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <SidebarBody mini={collapsed} />
      </aside>

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-[var(--color-line)] bg-[var(--color-deep)]">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 text-[var(--color-muted)] hover:text-[var(--color-text)]"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            <SidebarBody mini={false} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--color-line)] bg-[rgba(7,13,22,.85)] px-5 backdrop-blur-md">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={toggleCollapsed}
            className="hidden text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)] lg:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href={`/${role}/notifications`}
              className="relative text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-signal)] px-1 font-[family-name:var(--font-mono-src)] text-[.6rem] font-bold text-[var(--color-void)]">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>

            <ProfileMenu role={role} name={name} email={email} />
          </div>
        </header>

        <main className="flex-1 px-5 py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
