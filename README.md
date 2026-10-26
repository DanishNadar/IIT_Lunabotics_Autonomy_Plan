# Lunabotics Autonomy Command Center

Engineering platform for the **Illinois Tech Robotics — NASA Lunabotics 2027 Autonomy Team**: task management, guided technical assignments, learning paths, sprint planning, dependency and ROS architecture graphs, experiments, a knowledge base, and an evidence-based mission-readiness dashboard.

> All seeded member accounts are **labeled demo identities**. No real people, progress, or measured results are seeded. The two seeded experiments are marked as synthetic demonstrations.

## Team structure

The board is organised around the Autonomy Team only, in five categories that match the team's Discord channels:

| Category | Discord | Scope |
|---|---|---|
| 🧠 Autonomy General | `autonomy-general` | Coordination: ROS 2 architecture, mission logic, integration, testing, external team interfaces |
| 🕸️ Sensor Fusion & Localization | `sensor-fusion` | State estimation, calibration, localization confidence |
| 📸 Perception & Mapping | `perception` | Cameras/depth, obstacles, terrain, maps |
| 🗺️ Navigation & Planning | `navigation` | Planning, Nav2, local control of the path (not motors) |
| 🕹️ Simulation & Digital Twin | `simulations` | Gazebo world, rover model, simulated sensors, test scenarios |

Controls, Electrical, Mechanical and hardware work is **not** an autonomy category. It appears only as *external dependencies* (tracked on Overview, Mission Readiness and the Autonomy General page) and as *archived* tasks kept for history. Autonomy publishes high-level requests such as `/autonomy/cmd_vel`; Controls owns everything below that boundary (see AG-07 and the *Autonomy ↔ Controls Boundary* doc).

Every task shows its Discord channel. The board can filter or group by channel. **Copy for Discord** on a task page produces a formatted summary for you to paste. Nothing is posted to Discord automatically.

## Quick start (local, no external services)

```bash
npm install
cp .env.example .env.local     # optional in development
npm run dev                    # http://localhost:3000
```

Sign in with a demo account (Administrator, Autonomy Lead, Track Lead (SF), Members A–C, Viewer) or register a real account. In local mode data is saved **server-side** to `.data/db.json` and is shared by everyone using that running server. It is not browser-only storage, but it is also not suitable for serverless hosting (see Deployment).

Reset local data to the seed: `npm run db:reset:local` (or **Administration → Reset local data**).

## Architecture

| Layer | Where | Notes |
|---|---|---|
| Domain model | `src/lib/domain/types.ts` | Each collection maps 1:1 to a Postgres table |
| Rules (pure, unit-tested) | `src/lib/domain/*.ts` | Status transitions, permissions, assignment, checklist, dependency cycles, review/Definition of Done, readiness, sprints, workload, recommendations, resource validation |
| Commands | `src/lib/domain/commands.ts` | Zod-validated commands → authorization → rule checks → storage ops. The **only** write path |
| Server action | `src/app/actions/command.ts` | Runs a command inside a store lock against a fresh snapshot |
| Persistence adapters | `src/lib/server/store/` | `FileStore` (local/demo), `SupabaseStore` (production), `MemoryStore` (tests) |
| Seed content | `src/lib/seed/` | 5 categories, 22 initial + 23 advanced active tasks, 6 archived (externally owned) tasks, 140 resources (41 individually verified videos), 6 learning paths, 24 docs/ADRs, 28 ROS components, 6 external dependencies, 29 metric definitions |
| Data migrations | `src/lib/migrations/` | Versioned, idempotent, non-destructive upgrades of existing data (see below) |
| UI | `src/app/(app)/**`, `src/components/**` | Next.js App Router, Tailwind v4, Radix primitives (shadcn-style), TanStack Table, dnd-kit, React Flow, Recharts, Mermaid |

Authorization is enforced on the server for every command (`authorize()` in `permissions.ts`); the UI uses the same function only to decide what to show.

## Seeded content and verification

- Every GitHub reference in the initial tasks was fetched and confirmed to exist on **2026-10-25**; functions and classes listed under "Inspect" were read from the source. Limitations observed in source (e.g. stall flags never cleared, E-stop not latched, cost values outside OccupancyGrid range) are noted on each reference.
- Every resource URL returned HTTP 200 on that date, except two that block automated checks (OpenCV docs, CTMS PID tutorial). Those are marked **unverified**.
- No video durations or publication dates are recorded. Individual YouTube videos were confirmed through YouTube's oEmbed endpoint (title and channel). Tasks without a topic-specific verified video say so, and finding one is tracked as a **research TODO** rather than padded with weak matches.
- The LuSNAR dataset is gated (Hugging Face login + access approval). PM-04 says so and does not assume its contents.
- Topic names are proposed conventions labeled *illustrative* until AG-04 approves contracts. Commands are labeled **verified** (standard ROS/Gazebo CLI), **illustrative**, or **requires adaptation**.
- Numeric targets are internal engineering goals with rationale, never presented as competition requirements. Milestone and sprint dates are marked *proposed*.

## Upgrading existing data (v1 → v2 autonomy restructure)

Data written before the restructure (7 tracks: SF/PM/NV/MS/CS/SIM/IT) is migrated to the five-category model by `src/lib/migrations/v2-autonomy-restructure.ts`. The current version is stored in `app_settings.data_version`.

- **Nothing is deleted.** Assignments, comments, checklist progress, submissions, reviews and history stay attached because re-keyed tasks keep their UUID. Old keys are stored in `legacy_keys`, so `/tasks/MS-01` redirects to `/tasks/AG-01` with a "formerly" note. When a key now names a different task (e.g. SF-06), the page links to where the old one went. The full old → new mapping is in the *Autonomy Team Structure* doc.
- Seeded tasks that nobody edited are updated to the new content. Tasks someone edited keep their content and only get the organisational changes plus a note to review them.
- Controls/hardware tasks are **archived** with an owning team and reason. They stay readable and linkable, and leads can restore them.
- User-created MS/IT tasks move to Autonomy General; user-created CS tasks are archived as Controls work. Saved views, lead scopes and member tracks are remapped.
- Seed rows a user deleted are not re-added. The migration is idempotent: a second run does nothing.

How to run it:

- **Local file store:** runs automatically when the server loads `.data/db.json`. The original is first copied to `.data/db.json.v1-backup-<timestamp>.json`.
- **Supabase / explicit:** `npx tsx scripts/migrate-data.ts` prints a dry run of the operations. `npx tsx scripts/migrate-data.ts --apply` applies them. It targets Supabase when the Supabase env vars are set and `DATA_FILE`/`.data/db.json` otherwise. Before applying, apply the SQL migration `supabase/migrations/20261026000000_autonomy_restructure.sql`, which adds the new columns and the `external_dependencies` table and relaxes the track-id check. Take a database backup first.

## Supabase setup (production)

1. Create a Supabase project. Copy the URL, anon key and service-role key into `.env.local` (or Vercel env vars).
2. Apply the schema (tables, constraints, indexes, cycle-rejecting trigger, RLS, realtime publication):
   ```bash
   supabase link --project-ref <ref>
   supabase db push                       # applies supabase/migrations/*
   ```
   or paste the files in `supabase/migrations/` into the SQL editor, in filename order.
3. Seed the engineering content (no demo people):
   ```bash
   npm run db:seed:sql                    # regenerates supabase/seed.sql from the TS seed
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
4. Set `ADMIN_EMAILS` to the first administrator's email, then sign up. Profiles are created on first sign-in. Role comes from a pending invitation, `ADMIN_EMAILS`, or defaults to member.
5. **Security model:** the browser never receives the service-role key. Writes go through server actions that authorize first and then write with the service role. RLS grants authenticated active members read access to shared data and owner-only access to notifications, preferences and saved views. It grants no write policies, so direct client writes are denied.

### GitHub OAuth

Supabase → Authentication → Providers → GitHub. Create a GitHub OAuth App with callback `https://<project>.supabase.co/auth/v1/callback` and requested scopes `read:user user:email`. Add your site URL plus `/auth/callback` to Supabase redirect URLs. Set `NEXT_PUBLIC_GITHUB_OAUTH_ENABLED=true`.

### GitHub integration

- Link PRs, issues, commits or branches on any task. **Refresh** pulls PR state and check-run status from the GitHub API.
- Source previews are fetched server-side (`/api/github/file`).
- Optional `GITHUB_TOKEN`: use a fine-grained, read-only token limited to the repos you need. It raises rate limits and is required for private repos. Never use a token with broad org access.
- Branch convention: `feature/<TASK-ID>-<slug>`. PR title convention: `[TASK-ID] Summary`. Both are shown on each task.
- A merged PR **never** completes a task. Completion requires the Definition of Done plus an approving review.

### Email invitations

Administration → Invite. In Supabase mode this sends a Supabase invite email. In local mode it shows a one-time link; only the token hash is stored.

### Discord (optional)

Set `DISCORD_WEBHOOK_URL` to post team-level events only: new blockers, review requests, sprint starts, and reviews. Without it, nothing is sent to Discord. Per-task **Copy for Discord** only copies text to your clipboard.

## Deployment (Vercel)

1. Push the repo to GitHub and import it in Vercel (**Add New → Project**). `vercel.json` sets the Next.js framework, `npm ci` and `npm run build`. Node ≥ 20.9 is declared in `package.json`.
2. Finish **Supabase setup** above first: apply both SQL migrations, then load `supabase/seed.sql`.
3. In **Project → Settings → Environment Variables**, add these for Production (and Preview if previews should work):

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | yes | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | |
   | `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Never prefix with `NEXT_PUBLIC_` |
   | `ADMIN_EMAILS` | yes | First administrator(s) |
   | `SITE_URL` | for custom domains | Defaults to Vercel's production domain |
   | `GITHUB_TOKEN` | optional | Fine-grained, read-only |
   | `NEXT_PUBLIC_GITHUB_OAUTH_ENABLED` | optional | `true` after configuring the provider |
   | `DISCORD_WEBHOOK_URL` | optional | |

   `SESSION_SECRET`, `DATA_FILE` and `DEMO_ACCOUNTS` apply to local mode only. Demo accounts are off once Supabase is configured.
4. In Supabase → Authentication → URL Configuration, set **Site URL** to the production URL. Add `https://<your-domain>/auth/callback` to the redirect URLs, plus `https://*-<team>.vercel.app/auth/callback` if you use previews.
5. Deploy, then open `/api/health`. It should return `{"ok":true,"store":"supabase"}`.

**The local file store never runs on Vercel.** Vercel's filesystem is read-only and per-instance, so the app refuses to start a file store there. Without the Supabase variables, every page fails, and `/api/health` returns 503 with the missing configuration named. This replaces silently losing or splitting data.

Auth emails, GitHub OAuth and invite links use `SITE_URL`, else the Vercel production domain (in production), else the request origin. An invite created from a preview deployment therefore still points at the real site.

## Testing

```bash
npm run typecheck      # tsc --noEmit (strict)
npm run lint           # eslint
npm test               # vitest: domain unit tests + command-level integration tests
npm run build
npm run test:e2e       # Playwright against `next start` with an isolated, reseeded data file
```

- **Unit tests** cover status transitions, authorization, assignment rules, checklist completion, dependency cycle prevention, review rules, readiness computation, resource validation, sprint calculations, seed integrity, the five-category structure, the Discord summary format and the v1 → v2 migration. Migration tests check convergence with a fresh install, idempotency, progress preservation, no duplicate keys during the operation sequence, and the file-store backup.
- **Integration tests** run real commands against the seeded database: task creation and editing, claiming, assignment, checklists, resources, deliverables, review request, approval and changes requested, blockers, sprint start/close with rollover, archiving/restoring externally owned tasks, and external dependency updates.
- **E2E tests** cover authentication (demo, register, password, viewer read-only), lead assignment, member execution, the full review workflow, board filtering, the dependency graph, search, navigation, track-lead scope, legacy-key redirects, Discord channel filtering, archived tasks, Copy for Discord, and external team interfaces.

The SQL migrations, `scripts/migrate-data.ts --apply` against Supabase, and the Supabase adapter have not been run against a live Supabase instance yet. Verify them in a staging project first.

## Permissions summary

| Action | Admin | Autonomy Lead | Track Lead | Member | Viewer |
|---|---|---|---|---|---|
| Members, roles, settings, invitations | ✓ | | | | |
| Sprints, milestones, resource verification, readiness flag | ✓ | ✓ | | | |
| Create/edit/assign/review/archive tasks, dependencies, external dependency status | ✓ | ✓ | own tracks | | |
| Update assigned tasks (checklist, evidence, PRs, blockers, request review) | ✓ | ✓ | own tracks | assigned | |
| Claim/request tasks, comment, suggest resources, edit docs, record experiments | ✓ | ✓ | ✓ | ✓ | |
| Read everything, learning progress | ✓ | ✓ | ✓ | ✓ | ✓ |

When a task requires independent review, nobody assigned to it can approve it, including leads.
