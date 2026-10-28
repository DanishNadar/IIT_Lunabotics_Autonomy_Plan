# Lunabotics Autonomy Command Center

Engineering platform for the **Illinois Tech Robotics — NASA Lunabotics 2027 Autonomy Team**: task management, guided technical assignments, learning paths, sprint planning, dependency and ROS architecture graphs, experiments, a knowledge base, and an evidence-based mission-readiness dashboard.

> **Anyone can view everything without an account.** There is no login screen. The unlisted **`/admin`** page asks for the admin password and unlocks adding and changing tasks, members, resources and settings across the board. Team members are records the admin creates; they don't log in.
>
> All seeded member profiles are **labeled demo identities**. No real people, progress, or measured results are seeded. The two seeded experiments are marked as synthetic demonstrations.

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

Open the board without signing in. To edit, open `/admin` and enter `ADMIN_PASSWORD` from `.env.local`. In local mode that page also lists labeled demo personas (Autonomy Lead, Track Lead (SF), Members A–C, Viewer) for trying role-based workflows. In local mode data is saved **server-side** to `.data/db.json` and is shared by everyone using that running server. It is not browser-only storage, but it is also not suitable for serverless hosting (see Deployment).

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
4. Set `ADMIN_PASSWORD` and `SESSION_SECRET`. Supabase Auth is not used: there are no user accounts.
5. **Security model:** the browser never receives the service-role key and never queries tables directly. Every page is rendered on the server, which reads with the service role, so the board is public to read. Every write is a server action that requires the admin session (an HTTP-only cookie signed with `SESSION_SECRET` and tied to the current `ADMIN_PASSWORD`). RLS grants anonymous clients nothing, so the anon key cannot read or write tables. Wrong admin passwords are throttled per IP.

### GitHub integration

- Link PRs, issues, commits or branches on any task. **Refresh** pulls PR state and check-run status from the GitHub API.
- Source previews are fetched server-side (`/api/github/file`).
- Optional `GITHUB_TOKEN`: use a fine-grained, read-only token limited to the repos you need. It raises rate limits and is required for private repos. Never use a token with broad org access.
- Branch convention: `feature/<TASK-ID>-<slug>`. PR title convention: `[TASK-ID] Summary`. Both are shown on each task.
- A merged PR **never** completes a task. Completion requires the Definition of Done plus an approving review.

### Team members

Administration → **Add a team member** creates a member record (name, role, category, optional Discord/GitHub) for assignments. Members don't have logins; the admin makes changes on their behalf.

### Discord (optional)

Set `DISCORD_WEBHOOK_URL` to post team-level events only: new blockers, review requests, sprint starts, and reviews. Without it, nothing is sent to Discord. Per-task **Copy for Discord** only copies text to your clipboard.

### Assignment emails (optional)

**Admin → Email task lists** builds an email for each person, listing their open tasks: full name, category, role, status, due date, first unfinished step and a link. **Open in Gmail** and **Open in my email app** open a ready draft to send yourself, with no setup. To send straight from the page, set `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a domain verified in Resend). Emails are only sent when an admin presses **Send**. Member email addresses are only visible to admins.

## Deployment (Vercel)

1. Push the repo to GitHub and import it in Vercel (**Add New → Project**). `vercel.json` sets the Next.js framework, `npm ci` and `npm run build`. Node ≥ 20.9 is declared in `package.json`.
2. Finish **Supabase setup** above first: apply all SQL migrations in `supabase/migrations/` in filename order, then load `supabase/seed.sql`.
3. In **Project → Settings → Environment Variables**, add these for Production (and Preview if previews should work):

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | yes | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | |
   | `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Never prefix with `NEXT_PUBLIC_` |
   | `ADMIN_PASSWORD` | yes | Unlocks editing. Keep it out of the repo; changing it signs every admin out |
   | `SESSION_SECRET` | yes | Long random string that signs the admin cookie (`openssl rand -base64 48`) |
   | `GITHUB_TOKEN` | optional | Fine-grained, read-only |
   | `DISCORD_WEBHOOK_URL` | optional | |
   | `RESEND_API_KEY`, `EMAIL_FROM` | optional | Send assignment emails from /admin; without them emails open as drafts |

   `DATA_FILE` and `DEMO_ACCOUNTS` apply to local mode only. Demo personas are off once Supabase is configured.
4. Deploy, then open `/api/health`. It should return `{"ok":true,"store":"supabase"}`.

**The local file store never runs on Vercel.** Vercel's filesystem is read-only and per-instance, so the app refuses to start a file store there. Without the Supabase variables, every page fails, and `/api/health` returns 503 with the missing configuration named. This replaces silently losing or splitting data.


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
- **E2E tests** cover public read-only access, the admin password (wrong and right), adding a member, local demo personas, lead assignment, member execution, the full review workflow, board filtering, the dependency graph, search, navigation, track-lead scope, legacy-key redirects, Discord channel filtering, archived tasks, Copy for Discord, and external team interfaces.

The SQL migrations, `scripts/migrate-data.ts --apply` against Supabase, and the Supabase adapter have not been run against a live Supabase instance yet. Verify them in a staging project first.

## Permissions summary

| Action | Admin | Autonomy Lead | Track Lead | Member | Viewer |
|---|---|---|---|---|---|
| Members, roles, settings | ✓ | | | | |
| Sprints, milestones, resource verification, readiness flag | ✓ | ✓ | | | |
| Create/edit/assign/review/archive tasks, dependencies, external dependency status | ✓ | ✓ | own tracks | | |
| Update assigned tasks (checklist, evidence, PRs, blockers, request review) | ✓ | ✓ | own tracks | assigned | |
| Claim/request tasks, comment, suggest resources, edit docs, record experiments | ✓ | ✓ | ✓ | ✓ | |
| Read everything, learning progress | ✓ | ✓ | ✓ | ✓ | ✓ |

**Visitors without the admin password are viewers.** The admin password gives the Admin column. The other roles apply to member records and to the local demo personas.

When a task requires independent review, nobody assigned to it can approve it, including leads.
