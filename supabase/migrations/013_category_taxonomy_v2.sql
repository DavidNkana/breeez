-- 013: Evasale v2 category taxonomy (fashion-world-aligned)

alter table public.categories
  add column if not exists show_on_home boolean not null default false;

insert into public.categories (slug, name, sort_order, show_on_home) values
  ('women',               'Women',                1, true),
  ('men',                 'Men',                  2, true),
  ('kids',                'Kids',                 3, true),
  ('babywear',            'Babywear',             4, false),
  ('plus-size',           'Plus Size',            5, false),
  ('shoes',               'Shoes',                6, true),
  ('bags',                'Bags',                 7, true),
  ('apparel',             'Apparel',              8, false),
  ('home-decor',          'Home Decor',           9, true),
  ('kitchen',             'Kitchen',             10, true),
  ('bed-bath',            'Bed & Bath',          11, true),
  ('curtains',            'Curtains',            12, false),
  ('everyday-essentials', 'Everyday Essentials', 13, false),
  ('back-to-school',      'Back to School',      14, false)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  show_on_home = excluded.show_on_home,
  is_active = true;

-- Reassign legacy products only when both source and destination categories exist.
update public.products p
  set category_id = (select id from public.categories where slug = 'women')
  where category_id = (select id from public.categories where slug = 'apparel')
    and exists (select 1 from public.categories where slug = 'women');

update public.products p
  set category_id = (select id from public.categories where slug = 'bed-bath')
  where category_id in (
    (select id from public.categories where slug = 'bedroom'),
    (select id from public.categories where slug = 'bathroom')
  )
  and exists (select 1 from public.categories where slug = 'bed-bath');

-- Preserve legacy rows for historical foreign-key references.
update public.categories
  set is_active = false
  where slug in ('apparel', 'bedroom', 'bathroom');
