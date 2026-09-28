-- Milestone 4: profiles, and everyone shares recipes with everyone.
--
-- For now there is one open group: every signed-in user can read every recipe.
-- The groups and group_members tables wait until real users ask for private groups.
-- Chef's notes stay private to the author, so they move out of recipes (which everyone
-- can now read) into their own table.
--
-- Safe to run more than once, e.g. after a partial run.

-- Profiles ----------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text
);

alter table public.profiles enable row level security;

drop policy if exists "signed-in users read profiles" on public.profiles;
create policy "signed-in users read profiles" on public.profiles
  for select to authenticated using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Every user gets a profile on sign-up, named after their email until they change it.
create or replace function public.create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(split_part(new.email, '@', 1), ''), 'Cook'), 50))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_profile() from public, anon, authenticated;

drop trigger if exists create_profile on auth.users;
create trigger create_profile after insert on auth.users
  for each row execute function public.create_profile();

insert into public.profiles (id, display_name)
select id, left(coalesce(nullif(split_part(email, '@', 1), ''), 'Cook'), 50)
from auth.users
on conflict (id) do nothing;

-- Lets the API embed a recipe's author: recipes.select('*, author:profiles(display_name)').
alter table public.recipes drop constraint if exists recipes_author_id_profiles_fkey;
alter table public.recipes
  add constraint recipes_author_id_profiles_fkey
  foreign key (author_id) references public.profiles (id) on delete cascade;

create index if not exists recipes_created_at_idx on public.recipes (created_at desc);

-- Chef's notes --------------------------------------------------------------

create table if not exists public.recipe_notes (
  recipe_id uuid primary key references public.recipes (id) on delete cascade,
  notes text not null
);

alter table public.recipe_notes enable row level security;

drop policy if exists "authors manage own notes" on public.recipe_notes;
create policy "authors manage own notes" on public.recipe_notes
  for all to authenticated
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())
  ));

-- Only while recipes.notes still exists, i.e. on the first run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes' and column_name = 'notes'
  ) then
    insert into public.recipe_notes (recipe_id, notes)
    select id, notes from public.recipes where coalesce(notes, '') <> ''
    on conflict (recipe_id) do nothing;
    alter table public.recipes drop column notes;
  end if;
end;
$$;

-- Sharing -------------------------------------------------------------------

drop policy if exists "authors read own recipes" on public.recipes;
drop policy if exists "signed-in users read recipes" on public.recipes;
create policy "signed-in users read recipes" on public.recipes
  for select to authenticated using (true);

drop policy if exists "users read own recipe photos" on storage.objects;
drop policy if exists "signed-in users read recipe photos" on storage.objects;
create policy "signed-in users read recipe photos" on storage.objects
  for select to authenticated using (bucket_id = 'recipe-photos');

-- Tell the API about the new tables and relationship straight away.
notify pgrst, 'reload schema';
