-- Free-text credit for where a recipe came from, e.g. "Jamie Oliver, 5 Ingredients".
-- source_url stays for recipes imported from a web page (milestone 2).

alter table public.recipes add column source text;
