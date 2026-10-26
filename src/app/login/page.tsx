import { redirect } from "next/navigation";
import { ROLE_LABEL } from "@/lib/domain/types";
import { authMode, getActor } from "@/lib/server/auth";
import { env } from "@/lib/server/env";
import { getStore } from "@/lib/server/store";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string; email?: string; error?: string }> }) {
  if (await getActor()) redirect("/");
  const sp = await searchParams;
  const mode = authMode();
  const db = await getStore().snapshot();
  const demo = mode === "local" && env.demoAccounts ? db.members.filter((m) => m.isDemo && m.active).map((m) => ({ id: m.id, name: m.name, role: ROLE_LABEL[m.role], color: m.avatarColor, bio: m.bio })) : [];
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[920px]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-accent text-white">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="8" />
              <path d="M4 12h16M12 4c2.5 2.2 2.5 13.8 0 16" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-fg">Lunabotics Autonomy Command Center</h1>
            <p className="text-xs text-muted">Illinois Tech Robotics — NASA Lunabotics 2027 · Autonomous Systems</p>
          </div>
        </div>
        <LoginForm
          mode={mode}
          demo={demo}
          github={mode === "supabase" && env.githubOAuthEnabled}
          invite={sp.invite ?? null}
          inviteEmail={sp.email ?? ""}
          error={sp.error ?? null}
          storageNote={mode === "local" ? getStore().description : null}
        />
      </div>
    </div>
  );
}
