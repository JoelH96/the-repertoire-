-- Milestone 1: personal cookbook + photo import.
-- profiles, groups, group_members and saves arrive in later milestones.

-- Recipes ---------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  servings text,
  total_time text,
  ingredients text[] not null default '{}',
  steps text[] not null default '{}',
  source_url text,
  source_photos text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index recipes_author_id_created_at_idx on public.recipes (author_id, created_at desc);

alter table public.recipes enable row level security;

-- Milestone 3 widens select to "author shares a group with me".
create policy "authors read own recipes" on public.recipes
  for select to authenticated using (author_id = (select auth.uid()));

create policy "authors insert own recipes" on public.recipes
  for insert to authenticated with check (author_id = (select auth.uid()));

create policy "authors update own recipes" on public.recipes
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "authors delete own recipes" on public.recipes
  for delete to authenticated using (author_id = (select auth.uid()));

-- Recipe photos (private bucket, one folder per user: <user_id>/<file>.jpg) ---

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 10485760, array['image/jpeg']);

create policy "users read own recipe photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users upload own recipe photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own recipe photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Photo extraction daily limit ---------------------------------------------

create table public.extraction_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (user_id, day)
);

-- No policies: only claim_extraction() (security definer) touches this table.
alter table public.extraction_usage enable row level security;

-- Records one extraction for the calling user and returns whether it is within
-- today's limit. The limit lives here, not in app code, so clients can't change it.
create function public.claim_extraction()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  daily_limit constant int := 20;
  new_count int;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into public.extraction_usage (user_id, day, count)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = public.extraction_usage.count + 1
  returning count into new_count;

  return new_count <= daily_limit;
end;
$$;

revoke execute on function public.claim_extraction() from public, anon;
grant execute on function public.claim_extraction() to authenticated;
