-- Milestone 4: profiles, and everyone shares recipes with everyone.
--
-- For now there is one open group: every signed-in user can read every recipe.
-- The groups and group_members tables wait until real users ask for private groups.
-- Chef's notes stay private to the author, so they move out of recipes (which everyone
-- can now read) into their own table.

-- Profiles ----------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text
);

alter table public.profiles enable row level security;

create policy "signed-in users read profiles" on public.profiles
  for select to authenticated using (true);

create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Every user gets a profile on sign-up, named after their email until they change it.
create function public.create_profile()
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

create trigger create_profile after insert on auth.users
  for each row execute function public.create_profile();

insert into public.profiles (id, display_name)
select id, left(coalesce(nullif(split_part(email, '@', 1), ''), 'Cook'), 50)
from auth.users
on conflict (id) do nothing;

-- Lets the API embed a recipe's author: recipes.select('*, author:profiles(display_name)').
alter table public.recipes
  add constraint recipes_author_id_profiles_fkey
  foreign key (author_id) references public.profiles (id) on delete cascade;

create index recipes_created_at_idx on public.recipes (created_at desc);

-- Chef's notes --------------------------------------------------------------

create table public.recipe_notes (
  recipe_id uuid primary key references public.recipes (id) on delete cascade,
  notes text not null
);

alter table public.recipe_notes enable row level security;

create policy "authors manage own notes" on public.recipe_notes
  for all to authenticated
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())
  ));

insert into public.recipe_notes (recipe_id, notes)
select id, notes from public.recipes where coalesce(notes, '') <> '';

alter table public.recipes drop column notes;

-- Sharing -------------------------------------------------------------------

drop policy "authors read own recipes" on public.recipes;

create policy "signed-in users read recipes" on public.recipes
  for select to authenticated using (true);

drop policy "users read own recipe photos" on storage.objects;

create policy "signed-in users read recipe photos" on storage.objects
  for select to authenticated using (bucket_id = 'recipe-photos');
