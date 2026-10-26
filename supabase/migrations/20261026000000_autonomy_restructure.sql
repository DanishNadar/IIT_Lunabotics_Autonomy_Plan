-- Autonomy restructure (data version 2): five Discord-aligned categories, archived /
-- externally owned tasks, legacy task keys, and external dependencies.
--
-- This migration only changes the schema and is safe on existing data (additive
-- columns with defaults, no rows deleted). Moving rows into the new structure is done by
-- the data migration, which preserves task ids, assignments, comments and history:
--
--   npx tsx scripts/migrate-data.ts           # dry run
--   npx tsx scripts/migrate-data.ts --apply   # apply
--
-- Fresh installs: run this file, then supabase/seed.sql (already version 2).

-- Tracks: AG/SF/PM/NV/SIM after the data migration; allow legacy ids until it runs.
alter table tracks drop constraint if exists tracks_id_check;
alter table tracks add constraint tracks_id_format check (id ~ '^[A-Z]{2,3}$');
alter table tracks
  add column if not exists short_name text not null default '',
  add column if not exists emoji text not null default '',
  add column if not exists discord_channel text not null default '',
  add column if not exists coordination boolean not null default false;

alter table app_settings add column if not exists data_version int not null default 1;

alter table tasks
  add column if not exists legacy_keys text[] not null default '{}',
  add column if not exists archived boolean not null default false,
  add column if not exists external_team text check (external_team in ('Controls','Electrical','Mechanical','Hardware')),
  add column if not exists archived_reason text not null default '';
create index if not exists tasks_legacy_keys_idx on tasks using gin (legacy_keys);
create index if not exists tasks_active_idx on tasks(track_id, status) where not archived;

alter table integration_components
  add column if not exists owner_team text not null default 'Autonomy'
  check (owner_team in ('Autonomy','Controls','Electrical','Mechanical','Hardware'));

create table if not exists external_dependencies (
  id uuid primary key default gen_random_uuid(),
  team text not null check (team in ('Controls','Electrical','Mechanical','Hardware')),
  title text not null,
  description text not null default '',
  needs text[] not null default '{}',
  task_ids uuid[] not null default '{}',
  status text not null default 'not_requested' check (status in ('not_requested','requested','in_progress','delivered','blocked')),
  contact text not null default '',
  workaround text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table external_dependencies enable row level security;
drop policy if exists external_dependencies_read on external_dependencies;
create policy external_dependencies_read on external_dependencies for select to authenticated using (is_active_member());
drop trigger if exists external_dependencies_touch on external_dependencies;
create trigger external_dependencies_touch before update on external_dependencies for each row execute function touch_updated_at();

do $$ begin
  alter publication supabase_realtime add table external_dependencies;
exception when duplicate_object then null;
end $$;
