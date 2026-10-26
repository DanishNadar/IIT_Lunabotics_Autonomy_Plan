-- Lunabotics Autonomy Command Center — initial schema
-- Column names are the snake_case form of the domain model in src/lib/domain/types.ts;
-- the Supabase adapter maps top-level keys 1:1, so keep them in sync.
--
-- Security model:
--   * All writes go through Next.js server actions using the service-role key AFTER the
--     application authorizes them (src/lib/domain/permissions.ts). No write policies are
--     granted to anon/authenticated, so direct client writes are denied.
--   * RLS read policies limit direct client access (e.g. realtime subscriptions with the
--     anon key) to active team members, and private rows to their owner.

create extension if not exists "pgcrypto";

-- ───────────────────────────── reference data ─────────────────────────────
create table tracks (
  id text primary key check (id in ('SF','PM','NV','SIM','MS','CS','IT')),
  name text not null,
  mission text not null,
  color text not null,
  icon text not null,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subtracks (
  id uuid primary key default gen_random_uuid(),
  track_id text not null references tracks(id) on delete cascade,
  name text not null,
  "order" int not null default 0,
  unique (track_id, name)
);

create table app_settings (
  id uuid primary key default gen_random_uuid(),
  organization text not null,
  team text not null,
  claim_mode text not null default 'approval' check (claim_mode in ('open','approval','disabled')),
  allow_self_registration boolean not null default false,
  e2e_demonstration jsonb not null default '{"demonstrated": false, "evidenceUrl": null, "recordedBy": null, "recordedAt": null}',
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── people ─────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 2 and 80),
  email text not null,
  role text not null default 'member' check (role in ('admin','autonomy_lead','track_lead','member','viewer')),
  is_demo boolean not null default false,
  primary_track_id text references tracks(id) on delete set null,
  secondary_track_id text references tracks(id) on delete set null,
  lead_track_ids text[] not null default '{}',
  github_username text check (github_username ~ '^[A-Za-z0-9-]{1,39}$'),
  discord_handle text,
  skills text[] not null default '{}',
  experience text not null default 'new' check (experience in ('new','some','experienced')),
  availability_hours numeric(4,1) not null default 5 check (availability_hours between 0 and 60),
  bio text not null default '',
  avatar_color text not null default '#475569',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on profiles(role);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('admin','autonomy_lead','track_lead','member','viewer')),
  lead_track_ids text[] not null default '{}',
  token_hash text not null unique,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index invitations_email_idx on invitations(lower(email));

-- ───────────────────────────── planning ─────────────────────────────
create table milestones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  target_date date not null,
  track_ids text[] not null default '{}',
  status text not null default 'proposed' check (status in ('proposed','active','met','missed')),
  created_at timestamptz not null default now()
);

create table sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'planned' check (status in ('planned','active','completed')),
  capacity_hours numeric(7,1) not null default 0 check (capacity_hours >= 0),
  member_ids uuid[] not null default '{}',
  retrospective jsonb,
  is_proposed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
-- At most one active sprint.
create unique index sprints_one_active on sprints((status)) where status = 'active';

-- ───────────────────────────── tasks ─────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[A-Z]{2,3}-[0-9]{2,}$'),
  title text not null check (length(title) between 4 and 160),
  track_id text not null references tracks(id) on delete restrict,
  subtrack_id uuid references subtracks(id) on delete set null,
  priority text not null check (priority in ('critical','high','medium','low')),
  difficulty text not null check (difficulty in ('beginner','intermediate','advanced','expert')),
  estimate_hours int not null check (estimate_hours between 1 and 400),
  status text not null default 'backlog' check (status in ('backlog','available','assigned','researching','designing','implementing','testing','in_review','blocked','completed')),
  status_before_blocked text,
  backlog text not null default 'initial' check (backlog in ('initial','advanced')),
  sprint_id uuid references sprints(id) on delete set null,
  milestone_id uuid references milestones(id) on delete set null,
  start_date date,
  due_date date,
  reviewer_id uuid references profiles(id) on delete set null,
  requires_independent_review boolean not null default true,
  claimable boolean not null default true,
  labels text[] not null default '{}',
  spec jsonb not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now()
);
create index tasks_track_status_idx on tasks(track_id, status);
create index tasks_sprint_idx on tasks(sprint_id);
create index tasks_milestone_idx on tasks(milestone_id);

create table task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('owner','contributor')),
  responsibility text not null default '',
  assigned_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (task_id, member_id)
);
create index task_assignments_member_idx on task_assignments(member_id);
-- One primary owner per task.
create unique index task_assignments_one_owner on task_assignments(task_id) where role = 'owner';

create table task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  parent_id uuid references task_checklist_items(id) on delete cascade,
  "order" int not null default 0,
  text text not null,
  detail text not null default '',
  required boolean not null default true,
  done boolean not null default false,
  done_by uuid references profiles(id) on delete set null,
  done_at timestamptz,
  owner_id uuid references profiles(id) on delete set null,
  evidence text not null default '',
  resource_ids uuid[] not null default '{}'
);
create index task_checklist_items_task_idx on task_checklist_items(task_id);

create table task_dependencies (
  id uuid primary key default gen_random_uuid(),
  from_task_id uuid not null references tasks(id) on delete cascade,
  to_task_id uuid not null references tasks(id) on delete cascade,
  kind text not null check (kind in ('blocks','integrates')),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (from_task_id, to_task_id),
  check (from_task_id <> to_task_id)
);
create index task_dependencies_to_idx on task_dependencies(to_task_id);

-- Defense in depth: reject cycles even if a write bypasses the application check.
create or replace function reject_dependency_cycle() returns trigger language plpgsql as $$
begin
  if exists (
    with recursive reach(id) as (
      select new.to_task_id
      union
      select d.to_task_id from task_dependencies d join reach r on d.from_task_id = r.id
    )
    select 1 from reach where id = new.from_task_id
  ) then
    raise exception 'dependency cycle: % -> %', new.from_task_id, new.to_task_id;
  end if;
  return new;
end $$;
create trigger task_dependencies_no_cycle before insert or update on task_dependencies
  for each row execute function reject_dependency_cycle();

create table task_deliverables (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  "order" int not null default 0,
  title text not null,
  kind text not null check (kind in ('code','launch','config','docs','tests','benchmark','media','pr','notebook','diagram')),
  required boolean not null default true
);
create index task_deliverables_task_idx on task_deliverables(task_id);

create table deliverable_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  deliverable_id uuid not null references task_deliverables(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  url text not null check (url ~ '^https?://'),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index deliverable_submissions_task_idx on deliverable_submissions(task_id);

create table task_acceptance_criteria (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  "order" int not null default 0,
  text text not null,
  target text,
  rationale text,
  verified boolean not null default false,
  verified_by uuid references profiles(id) on delete set null,
  check (target is null or rationale is not null)
);
create index task_acceptance_criteria_task_idx on task_acceptance_criteria(task_id);

create table task_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete restrict,
  decision text not null check (decision in ('approved','changes_requested')),
  ratings jsonb not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index task_reviews_task_idx on task_reviews(task_id);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references task_comments(id) on delete cascade,
  kind text not null default 'discussion' check (kind in ('discussion','question','review','blocker')),
  body text not null check (length(body) between 1 and 10000),
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index task_comments_task_idx on task_comments(task_id, created_at);

create table task_progress_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  checklist_item_id uuid references task_checklist_items(id) on delete set null,
  worked_on text not null,
  changed text not null default '',
  problems text not null default '',
  experiments text not null default '',
  learned text not null default '',
  next_steps text not null default '',
  hours numeric(4,1) check (hours between 0 and 24),
  created_at timestamptz not null default now()
);
create index task_progress_logs_task_idx on task_progress_logs(task_id, created_at);

create table task_blockers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  description text not null,
  raised_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  resolution text not null default ''
);
create index task_blockers_open_idx on task_blockers(task_id) where resolved_at is null;

create table task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  "from" text,
  "to" text not null,
  changed_by uuid references profiles(id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index task_status_history_task_idx on task_status_history(task_id, created_at);

create table task_claims (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('interest','request','claim')),
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','declined','withdrawn')),
  decided_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index task_claims_one_pending on task_claims(task_id, member_id) where status = 'pending';

create table github_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  kind text not null check (kind in ('pr','issue','commit','branch')),
  repo text not null,
  number int,
  ref text,
  url text not null check (url like 'https://github.com/%'),
  title text not null,
  state text not null default 'unknown' check (state in ('open','draft','merged','closed','unknown')),
  checks text not null default 'unknown' check (checks in ('passing','failing','pending','none','unknown')),
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  synced_at timestamptz,
  unique (task_id, url)
);

-- ───────────────────────────── knowledge ─────────────────────────────
create table resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null unique check (url ~ '^https?://'),
  publisher text not null,
  type text not null check (type in ('source','docs','tutorial','video','paper','dataset','visualization','architecture','course','tool')),
  difficulty text check (difficulty in ('beginner','intermediate','advanced','expert')),
  duration text,
  why text not null,
  topics text[] not null default '{}',
  track_ids text[] not null default '{}',
  last_verified date,
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table task_resources (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  category text not null check (category in ('primary_source','official_docs','text_tutorial','video_tutorial','paper','dataset','visualization','reference_architecture','internal')),
  "order" int not null default 0,
  why text not null default '',
  step_refs int[] not null default '{}',
  unique (task_id, resource_id)
);

create table research_todos (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  note text not null default '',
  track_id text references tracks(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now()
);

create table repositories (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  name text not null,
  url text not null,
  team text not null,
  default_branch text not null,
  description text not null default '',
  kind text not null check (kind in ('reference','team')),
  unique (owner, name)
);

create table learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  audience text not null,
  summary text not null,
  prerequisites text[] not null default '{}',
  objectives text[] not null default '{}',
  follow_on_task_keys text[] not null default '{}',
  track_id text references tracks(id) on delete set null,
  "order" int not null default 0
);

create table learning_modules (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references learning_paths(id) on delete cascade,
  "order" int not null default 0,
  title text not null,
  objective text not null,
  checklist text[] not null default '{}',
  exercise text,
  resource_ids uuid[] not null default '{}'
);

create table learning_progress (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles(id) on delete cascade,
  module_id uuid not null references learning_modules(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (member_id, module_id)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('onboarding','standards','architecture','decision','operations','competition')),
  tags text[] not null default '{}',
  owner_id uuid references profiles(id) on delete set null,
  body text not null default '',
  status text not null default 'draft' check (status in ('draft','published','needs_review')),
  adr jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  body text not null,
  title text not null,
  author_id uuid references profiles(id) on delete set null,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index document_revisions_doc_idx on document_revisions(document_id, created_at);

-- ───────────────────────────── experiments & architecture ─────────────────────────────
create table metric_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  domain text not null check (domain in ('localization','navigation','perception','control','simulation','mission')),
  name text not null,
  unit text not null,
  definition text not null,
  provenance text not null,
  higher_is_better boolean not null
);

create table experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  track_id text not null references tracks(id) on delete restrict,
  task_id uuid references tasks(id) on delete set null,
  hypothesis text not null default '',
  environment text not null default '',
  commit text not null default '',
  dataset text not null default '',
  parameters jsonb not null default '{}',
  metrics jsonb not null default '[]',
  results text not null default '',
  notes text not null default '',
  conclusions text not null default '',
  artifacts jsonb not null default '[]',
  status text not null default 'planned' check (status in ('planned','running','complete','invalid')),
  is_demo boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table integration_components (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  "group" text not null check ("group" in ('sensors','localization','perception','navigation','mission','control','safety')),
  name text not null,
  purpose text not null,
  inputs jsonb not null default '[]',
  outputs jsonb not null default '[]',
  parameters text[] not null default '{}',
  task_keys text[] not null default '{}',
  interface_status text not null default 'illustrative' check (interface_status in ('illustrative','verified')),
  owner_id uuid references profiles(id) on delete set null
);

-- ───────────────────────────── per-user ─────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  href text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_member_idx on notifications(member_id, read, created_at desc);

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references profiles(id) on delete cascade,
  disabled_kinds text[] not null default '{}'
);

create table saved_views (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  view text not null,
  filters jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null,
  summary text not null,
  href text,
  created_at timestamptz not null default now()
);
create index audit_events_created_idx on audit_events(created_at desc);

-- ───────────────────────────── updated_at triggers ─────────────────────────────
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['tracks','app_settings','profiles','sprints','tasks','documents','experiments'] loop
    execute format('create trigger %I_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

-- ───────────────────────────── row level security ─────────────────────────────
create or replace function is_active_member() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin')
$$;

do $$ declare t text; begin
  foreach t in array array[
    'tracks','subtracks','app_settings','profiles','milestones','sprints','tasks','task_assignments',
    'task_checklist_items','task_dependencies','task_deliverables','deliverable_submissions',
    'task_acceptance_criteria','task_reviews','task_comments','task_progress_logs','task_blockers',
    'task_status_history','task_claims','github_links','resources','task_resources','research_todos',
    'repositories','learning_paths','learning_modules','learning_progress','documents','document_revisions',
    'metric_definitions','experiments','integration_components','audit_events'
  ] loop
    execute format('alter table %I enable row level security', t);
    -- Shared engineering data: readable by any active member (viewers included).
    execute format('create policy %I on %I for select to authenticated using (is_active_member())', t || '_read', t);
  end loop;
end $$;

alter table notifications enable row level security;
create policy notifications_own on notifications for select to authenticated using (member_id = auth.uid());
alter table notification_preferences enable row level security;
create policy notification_preferences_own on notification_preferences for select to authenticated using (member_id = auth.uid());
alter table saved_views enable row level security;
create policy saved_views_own on saved_views for select to authenticated using (member_id = auth.uid());
alter table invitations enable row level security;
create policy invitations_admin on invitations for select to authenticated using (is_admin());
-- No insert/update/delete policies: client writes are denied; the server writes with the
-- service role after authorizing each command.

-- ───────────────────────────── realtime ─────────────────────────────
alter publication supabase_realtime add table tasks, task_assignments, task_checklist_items, task_comments,
  task_blockers, task_reviews, task_claims, deliverable_submissions, sprints, notifications, documents, experiments;
