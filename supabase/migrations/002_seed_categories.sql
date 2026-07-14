-- =============================================================================
-- Breeez — Seed the 10 product categories
-- Migration 002: seed_categories.sql
-- =============================================================================
-- Run AFTER 001_init.sql.
-- =============================================================================

insert into public.categories (slug, name, sort_order) values
  ('back-to-school',     'Back to School',      1),
  ('apparel',            'Apparel',             2),
  ('bags',               'Bags',                3),
  ('bathroom',           'Bathroom',            4),
  ('bedroom',            'Bedroom',             5),
  ('curtains',           'Curtains',            6),
  ('everyday-essentials','Everyday Essentials', 7),
  ('home-decor',         'Home Decor',          8),
  ('kitchen',            'Kitchen',             9),
  ('shoes',              'Shoes',              10)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;