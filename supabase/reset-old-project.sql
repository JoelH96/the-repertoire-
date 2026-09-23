-- One-off: removes the tables left over from the previous attempt at this app.
-- Run once in the Supabase SQL editor BEFORE applying migrations/0001_init.sql.
-- This permanently deletes the data in these tables.

drop table if exists public.comments cascade;
drop table if exists public.favorites cascade;
drop table if exists public.follows cascade;
drop table if exists public.recipe_photos cascade;
drop table if exists public.extraction_jobs cascade;
drop table if exists public.recipes cascade;
drop table if exists public.profiles cascade;
drop function if exists public.are_friends cascade;

-- Old storage buckets (avatars, recipe-images, extraction-uploads) can't be dropped
-- from SQL. Empty and delete them in Storage in the dashboard.
