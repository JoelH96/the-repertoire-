-- Resets the policies on storage.objects to exactly this app's recipe-photos policies.
--
-- Uploads failed with "new row violates row-level security policy" even though
-- 0001_init.sql's insert policy allows them, so storage.objects carries a policy
-- state we didn't create: leftovers from the previous app (whose buckets are
-- gone) or 0001's policies missing. This drops every policy on storage.objects,
-- then recreates ours. The notices list what was dropped. Safe to run more than once.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 10485760, array['image/jpeg'])
on conflict (id) do nothing;

do $$
declare
  p record;
begin
  for p in
    select policyname, permissive, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    raise notice 'Dropping policy "%" (% %, roles %) using: % check: %',
      p.policyname, p.permissive, p.cmd, p.roles, p.qual, p.with_check;
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end;
$$;

create policy "users read own recipe photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users upload own recipe photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own recipe photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
