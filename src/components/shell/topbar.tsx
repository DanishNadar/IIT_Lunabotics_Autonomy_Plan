"use client";

import { Ago } from "@/components/ui/time";
import { Bell, CheckCheck, ClipboardCheck, LogOut, Moon, Search, Sun, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { ROLE_LABEL, type Notification } from "@/lib/domain/types";
import { isGuestId } from "@/lib/guest";
import { cn } from "@/lib/utils";
import { useCommand } from "../use-command";
import { Menu, MenuItem, MenuLabel, MenuSeparator, Popover } from "../ui/overlay";
import { Avatar, Badge, Kbd } from "../ui/primitives";
import { useWorkspace } from "../workspace";

export function openPalette() {
  window.dispatchEvent(new CustomEvent("open-palette"));
}

export function Topbar({ unread, reviewQueue, leading }: { unread: number; reviewQueue: number; leading: ReactNode }) {
  const { actor } = useWorkspace();
  const guest = isGuestId(actor.id);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"), []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("acc-theme", next);
    } catch {}
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-11 items-center gap-2 border-b border-line bg-bg/90 px-3 backdrop-blur">
      {leading}
      <button
        onClick={openPalette}
        className="flex h-7 w-full max-w-sm items-center gap-2 rounded-md border border-line bg-panel px-2 text-xs text-faint hover:border-line-strong"
        aria-label="Search (Ctrl+K)"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search tasks, docs, resources…</span>
        <Kbd>Ctrl K</Kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        {reviewQueue > 0 && (
          <Link href="/my-work#reviews" className="hidden sm:block">
            <Badge tone="info">
              <ClipboardCheck /> {reviewQueue} awaiting review
            </Badge>
          </Link>
        )}
        {!guest && <Notifications unread={unread} />}
        <button onClick={toggleTheme} className="rounded p-1.5 text-muted hover:bg-panel-3 hover:text-fg" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        {!guest && (
        <Menu
          trigger={
            <button className="flex items-center gap-2 rounded-md py-1 pr-1 pl-1.5 hover:bg-panel-3" aria-label="Account menu">
              <Avatar name={actor.name} color={actor.avatarColor} size={22} />
              <span className="hidden max-w-[140px] truncate text-xs text-fg-2 md:inline">{actor.name}</span>
            </button>
          }
        >
          <MenuLabel>
            {ROLE_LABEL[actor.role]}
            {actor.isDemo && " · demo account"}
          </MenuLabel>
          <Link href={`/team/${actor.id}`}>
            <MenuItem>
              <User /> Profile & preferences
            </MenuItem>
          </Link>
          <Link href="/notifications">
            <MenuItem>
              <Bell /> Notification settings
            </MenuItem>
          </Link>
          <MenuSeparator />
          <MenuItem onSelect={() => void logout()}>
            <LogOut /> {actor.role === "admin" ? "Lock admin" : "Sign out"}
          </MenuItem>
        </Menu>
        )}
      </div>
    </header>
  );
}

function Notifications({ unread }: { unread: number }) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const { run } = useCommand();
  const load = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) setItems(await res.json());
    } catch {
      setItems([]);
    }
  };
  return (
    <Popover
      className="w-[360px] max-w-[calc(100vw-16px)]"
      trigger={
        <button onClick={load} className="relative rounded p-1.5 text-muted hover:bg-panel-3 hover:text-fg" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="size-4" />
          {unread > 0 && <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-0.5 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
        </button>
      }
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-xs font-semibold">Notifications</span>
        <button
          className="flex items-center gap-1 text-[11px] text-muted hover:text-fg"
          onClick={() => run({ type: "notification.read", notificationId: null }, { quiet: true, onSuccess: () => setItems((x) => x?.map((n) => ({ ...n, read: true })) ?? null) })}
        >
          <CheckCheck className="size-3" /> Mark all read
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        {items === null ? (
          <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-panel-3" />)}</div>
        ) : items.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted">You&apos;re all caught up.</p>
        ) : (
          items.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              onClick={() => !n.read && run({ type: "notification.read", notificationId: n.id }, { quiet: true })}
              className={cn("block border-b border-line px-3 py-2 hover:bg-panel-2", !n.read && "bg-info-soft/40")}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-info" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-fg">{n.title}</p>
                  {n.body && <p className="line-clamp-2 text-[11px] text-muted">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-faint"><Ago iso={n.createdAt} /></p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      <Link href="/notifications" className="block px-3 py-2 text-center text-[11px] text-muted hover:text-fg">
        All notifications & preferences
      </Link>
    </Popover>
  );
}
