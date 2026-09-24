-- Removes triggers the previous app left on auth.users and storage.objects.
--
-- reset-old-project.sql dropped the old tables with CASCADE, but that doesn't
-- remove triggers whose functions merely *mention* those tables (plpgsql bodies
-- aren't dependency-tracked). The leftover triggers still fire and fail:
--   - on sign-up (e.g. inserting into the dropped public.profiles), which makes
--     Supabase Auth return "Database error saving new user";
--   - on photo upload (e.g. inserting into the dropped public.recipe_photos),
--     which makes the storage upload fail.
--
-- Only triggers whose function lives outside Supabase's own schemas are dropped,
-- so Supabase's built-in storage triggers are kept. Safe to run more than once.

do $$
declare
  t record;
begin
  for t in
    select tg.tgname, tg.tgrelid::regclass as tbl, tg.tgfoid::regprocedure as fn
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where not tg.tgisinternal
      and tg.tgrelid in ('auth.users'::regclass, 'storage.objects'::regclass, 'storage.buckets'::regclass)
      and n.nspname not in ('auth', 'storage', 'extensions', 'supabase_functions', 'realtime', 'vault', 'pgsodium')
  loop
    raise notice 'Dropping trigger % on % (%)', t.tgname, t.tbl, t.fn;
    execute format('drop trigger %I on %s', t.tgname, t.tbl);
  end loop;
end;
$$;

-- Drop the old app's now-unused trigger functions. This app has none of its own yet.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
      and not exists (select 1 from pg_trigger tg where tg.tgfoid = p.oid)
  loop
    raise notice 'Dropping function %', f.fn;
    execute format('drop function %s', f.fn);
  end loop;
end;
$$;
