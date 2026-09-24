-- Recipes saved from photos before the fix kept a trailing carriage return on every
-- photo path but the last (browsers send form newlines as \r\n), so those photos
-- didn't show. The files themselves are fine; this repairs the stored paths.

update public.recipes
set source_photos = array(
  select rtrim(path, E'\r') from unnest(source_photos) with ordinality as p(path, n) order by n
)
where exists (select 1 from unnest(source_photos) as p(path) where path like E'%\r');
