"use client";

import {
  Activity,
  BookOpen,
  Boxes,
  CalendarRange,
  ClipboardCheck,
  FlaskConical,
  GanttChart,
  GitFork,
  GraduationCap,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Library,
  Menu as MenuIcon,
  Rocket,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "../workspace";
import { CommandPalette } from "./command-palette";
import { LiveRefresh } from "./live-refresh";
import { Topbar } from "./topbar";
import { isGuestId } from "@/lib/guest";

type NavItem = { href: string; label: string; icon: ReactNode; count?: number };

function NavGroup({ title, items, active, small }: { title?: string; items: NavItem[]; active: (href: string) => boolean; small?: boolean }) {
  return (
    <div className="space-y-0.5">
      {title && <div className="px-2 pb-0.5 text-[10px] font-semibold tracking-wider text-faint uppercase">{title}</div>}
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active(item.href) ? "page" : undefined}
          className={cn(
            "group flex items-center gap-2.5 rounded-md px-2 text-fg-2 transition-colors hover:bg-panel-3 hover:text-fg [&_svg]:size-4 [&_svg]:text-muted",
            small ? "py-1 text-xs" : "py-1.5 text-[13px]",
            active(item.href) && "bg-panel-3 text-fg [&_svg]:text-accent",
          )}
        >
          {item.icon}
          <span className="flex-1 truncate">{item.label}</span>
          {!!item.count && <span className="rounded bg-panel-2 px-1.5 font-mono text-[10px] text-muted">{item.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function AppShell({ children, counts, realtime }: { children: ReactNode; counts: { unread: number; myActive: number; reviewQueue: number }; realtime: { url: string; anonKey: string } | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { actor, settings, storage, demoMode, tracks } = useWorkspace();
  useEffect(() => setMobileOpen(false), [pathname]);

  const nav: NavItem[] = [
    { href: "/", label: "Overview", icon: <LayoutDashboard /> },
    ...(isGuestId(actor.id) ? [] : [{ href: "/my-work", label: "My Tasks", icon: <Inbox />, count: counts.myActive }]),
    { href: "/board", label: "All Tasks", icon: <KanbanSquare /> },
  ];
  const categories: NavItem[] = tracks.map((t) => ({ href: `/tracks/${t.id}`, label: t.shortName, icon: <span className="flex size-4 items-center justify-center text-[13px] leading-none">{t.emoji}</span> }));
  const planning: NavItem[] = [
    { href: "/sprints", label: "Sprint Planning", icon: <CalendarRange /> },
    { href: "/graph", label: "Dependency Graph", icon: <GitFork /> },
    { href: "/resources", label: "Resources", icon: <Library /> },
    { href: "/learn", label: "Learning Paths", icon: <GraduationCap /> },
    { href: "/architecture", label: "ROS Architecture", icon: <Boxes /> },
    { href: "/experiments", label: "Experiments & Testing", icon: <FlaskConical /> },
    { href: "/team", label: "Team Members", icon: <Users /> },
    { href: "/readiness", label: "Mission Readiness", icon: <Rocket /> },
  ];
  const more: NavItem[] = [
    { href: "/docs", label: "Knowledge Base", icon: <BookOpen /> },
    { href: "/roadmap", label: "Technical Roadmap", icon: <GanttChart /> },
    { href: "/activity", label: "Activity Feed", icon: <Activity /> },
    ...(actor.role === "admin" ? [{ href: "/admin", label: "Administration", icon: <Settings /> }] : []),
  ];
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 border-b border-line px-3 py-3">
        <div className="relative flex size-7 items-center justify-center rounded-md bg-accent text-white">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="8" />
            <path d="M4 12h16M12 4c2.5 2.2 2.5 13.8 0 16" />
          </svg>
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-semibold text-fg">Autonomy Command Center</div>
          <div className="truncate text-[10px] text-muted">{settings.organization}</div>
        </div>
      </Link>
      <div className="flex-1 space-y-3 overflow-y-auto px-2 py-2">
        <NavGroup items={nav} active={active} />
        <NavGroup title="Autonomy team" items={categories} active={active} />
        <NavGroup items={planning} active={active} />
        <NavGroup title="More" items={more} active={active} small />
      </div>
      <div className="space-y-1 border-t border-line px-3 py-2 text-[10px] text-faint">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", storage.kind === "supabase" ? "bg-ok" : "bg-warn")} />
          {storage.kind === "supabase" ? "Supabase · persistent" : "Local server store"}
        </div>
        {demoMode && <div className="flex items-center gap-1.5"><ClipboardCheck className="size-3" /> Demo accounts enabled</div>}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 border-r border-line bg-panel lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] border-r border-line bg-panel">
            <button className="absolute top-3 right-2 rounded p-1 text-muted hover:text-fg" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              <X className="size-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          unread={counts.unread}
          reviewQueue={counts.reviewQueue}
          leading={
            <button className="rounded p-1.5 text-muted hover:bg-panel-3 hover:text-fg lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <MenuIcon className="size-4" />
            </button>
          }
        />
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
      <CommandPalette />
      <LiveRefresh realtime={realtime} />
    </div>
  );
}
