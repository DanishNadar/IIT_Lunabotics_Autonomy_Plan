"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { authorize, type Action, type PermissionContext } from "@/lib/domain/permissions";
import type { AppSettings, Milestone, PublicMember, Sprint, Subtrack, TaskAssignment, Track } from "@/lib/domain/types";

export interface Workspace {
  actor: PublicMember;
  members: PublicMember[];
  tracks: Track[];
  subtracks: Subtrack[];
  sprints: Sprint[];
  milestones: Milestone[];
  settings: Pick<AppSettings, "claimMode" | "organization" | "team">;
  storage: { kind: string; shared: boolean; description: string };
  demoMode: boolean;
}

const Ctx = createContext<Workspace | null>(null);

export function WorkspaceProvider({ value, children }: { value: Workspace; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const ws = useContext(Ctx);
  if (!ws) throw new Error("useWorkspace outside provider");
  return ws;
}

/** UI-only permission check (the server re-checks every command). */
export function useCan() {
  const { actor } = useWorkspace();
  return useMemo(
    () => (action: Action, ctx?: PermissionContext & { assignments?: TaskAssignment[] }) => authorize(actor, action, ctx).ok,
    [actor],
  );
}

export function useLookup() {
  const ws = useWorkspace();
  return useMemo(() => {
    const member = new Map(ws.members.map((m) => [m.id, m]));
    const track = new Map(ws.tracks.map((t) => [t.id, t]));
    const subtrack = new Map(ws.subtracks.map((s) => [s.id, s]));
    const sprint = new Map(ws.sprints.map((s) => [s.id, s]));
    const milestone = new Map(ws.milestones.map((m) => [m.id, m]));
    return { member, track, subtrack, sprint, milestone };
  }, [ws]);
}
