-- Public read access + admin password.
-- The app no longer uses Supabase Auth accounts: visitors read without signing in and
-- the server writes (with the service role) on behalf of the password-unlocked
-- Administrator. Team members are records created by the admin, so profiles must no
-- longer require a matching auth.users row.

do $$
declare fk text;
begin
  select con.conname into fk
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'profiles' and con.contype = 'f'
    and con.confrelid = 'auth.users'::regclass;
  if fk is not null then
    execute format('alter table profiles drop constraint %I', fk);
  end if;
end $$;

alter table profiles alter column id set default gen_random_uuid();

-- Browsers never query tables directly (all reads go through the server), so the
-- existing authenticated-only RLS policies stay as they are: anonymous clients still
-- cannot read or write anything with the anon key.
