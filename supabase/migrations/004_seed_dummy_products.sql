-- Migration 004: 20 dummy products across all categories (Chris asked for realistic listings)
-- Run in Supabase SQL Editor AFTER 001_init.sql and 002_seed_categories.sql.
-- 6 products are marked featured.

delete from product_images where product_id in (select id from products where slug like 'dummy-%');
delete from product_variants where product_id in (select id from products where slug like 'dummy-%');
delete from products where slug like 'dummy-%';

do $$
declare
  _app uuid := (select id from categories where slug = 'apparel');
  _sho uuid := (select id from categories where slug = 'shoes');
  _kit uuid := (select id from categories where slug = 'kitchen');
  _bed uuid := (select id from categories where slug = 'bedroom');
  _bat uuid := (select id from categories where slug = 'bathroom');
  _dec uuid := (select id from categories where slug = 'home-decor');
  _bag uuid := (select id from categories where slug = 'bags');
  _cur uuid := (select id from categories where slug = 'curtains');
  _ess uuid := (select id from categories where slug = 'everyday-essentials');
  _sch uuid := (select id from categories where slug = 'back-to-school');
  _pid uuid;
  _now timestamptz := now();
begin
-- 1-6: 6 products with is_featured=true (one per visible category)
-- 7-20: 14 more regular products spread across all categories

-- 1 Oversized Linen Shirt (Apparel, featured)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
('dummy-linen-shirt','Oversized Linen Shirt','100% linen relaxed fit. Perfect for SA summer. Roll-tab sleeves with mother-of-pearl buttons.', _app,34900,44900,true,'{new,summer}',_now - interval '6 hours') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'OLS-WHT-M','White / M','{"colour":"White","size":"M"}',15),(_pid,'OLS-SND-L','Sand / L','{"colour":"Sand","size":"L"}',10);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1434389677669-e08b4cda4cd1?w=600&h=600&fit=crop',0);

-- 2 Ribbed Knit Tank (Apparel)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-knit-tank','Ribbed Knit Tank','Soft cotton-modal blend. High neck racerback. Layer or solo.', _app,16900,'{new,sale}',_now - interval '12 hours') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'RKT-BLK-S','Black / S','{"colour":"Black","size":"S"}',20),(_pid,'RKT-WHT-M','White / M','{"colour":"White","size":"M"}',18);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1503342217505-b0a501808605?w=600&h=600&fit=crop',0);

-- 3 Relaxed Cargo Pant (Apparel)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
('dummy-cargo-pant','Relaxed Cargo Pant','Cotton twill. Tapered leg. Drawstring waist.', _app,28900,34900,'{new,streetwear}',_now - interval '1 day') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'RCP-OLV-30','Olive / 30','{"colour":"Olive","size":"30"}',10),(_pid,'RCP-BLK-32','Black / 32','{"colour":"Black","size":"32"}',5);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&h=600&fit=crop',0);

-- 4 Dutch Oven (Kitchen, featured)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
('dummy-dutch-oven','Enamel Cast Iron Dutch Oven','5.5L pot. Oven-safe 260C. Perfect for potjiekos.', _kit,79900,99900,true,'{new,premium}',_now - interval '8 hours') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CIDO-RED-55','Cherry Red / 5.5L','{"colour":"Red"}',4),(_pid,'CIDO-BLU-55','Navy Blue / 5.5L','{"colour":"Blue"}',3);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop',0),(_pid,'https://images.unsplash.com/photo-1583263781443-4b4c7e62f06e?w=600&h=600&fit=crop',1);

-- 5 Bamboo Cutting Board Set (Kitchen)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-cutting-board','Bamboo Cutting Board Set','Set of 3 (S/M/L). Knife-friendly. Juice groove.', _kit,24900,'{sale,bestseller}',_now - interval '2 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'BCB-3SET','3-Piece Set','{}',25);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop',0);

-- 6 Stainless Steel Kettle (Kitchen)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
('dummy-steel-kettle','Stainless Steel Whistling Kettle','2L mirror finish. Induction compatible.', _kit,19900,26900,'{bestseller}',_now - interval '3 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SSK-SLV-2L','Silver','{}',30);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600&h=600&fit=crop',0);

-- 7 Linen Duvet Set (Bedroom, featured)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
('dummy-duvet-set','Stonewashed Linen Duvet Set','Full set: cover + 2 pillowcases. French flax linen.', _bed,64900,84900,true,'{new,premium}',_now - interval '10 hours') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SLD-QUE-OAT','Queen / Oatmeal','{"size":"Queen","colour":"Oatmeal"}',6),(_pid,'SLD-KNG-CHR','King / Charcoal','{"size":"King","colour":"Charcoal"}',4);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=600&fit=crop',0);

-- 8 Throw Blanket (Bedroom)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-throw-blanket','Chunky Knit Throw','Hand-knit cotton. 130x170cm.', _bed,39900,'{bestseller}',_now - interval '4 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CKB-CRM','Cream','{"colour":"Cream"}',12),(_pid,'CKB-CHR','Charcoal','{"colour":"Charcoal"}',8);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1555041469-a586c62ea9bc?w=600&h=600&fit=crop',0);

-- 9 Bath Towel Set (Bathroom, featured)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
('dummy-towel-set','Egyptian Cotton Towel Set','Set of 2. 600 GSM. Quick-drying.', _bat,29900,39900,true,'{new,bestseller}',_now - interval '5 hours') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'BTS-WHT','White / Set of 2','{"colour":"White"}',20),(_pid,'BTS-GRY','Grey / Set of 2','{"colour":"Grey"}',15);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&h=600&fit=crop',0);

-- 10 Bamboo Bath Mat (Bathroom)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-bath-mat','Bamboo Bath Mat','Slatted bamboo. Anti-slip. Spa aesthetic.', _bat,17900,'{new}',_now - interval '2 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'BBM-NAT','Natural','{}',18);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=600&h=600&fit=crop',0);

-- 11 Canvas Sneaker (Shoes)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
('dummy-sneaker','Classic Canvas Sneaker','Low-top canvas. Vulcanised sole. Metal eyelets.', _sho,27900,34900,'{new,bestseller}',_now - interval '1 day') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CCS-WHT-7','White / UK 7','{"colour":"White","size":"UK 7"}',10),(_pid,'CCS-WHT-8','White / UK 8','{"colour":"White","size":"UK 8"}',12),(_pid,'CCS-BLK-8','Black / UK 8','{"colour":"Black","size":"UK 8"}',6);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',0);

-- 12 Slide Sandal (Shoes, featured)
insert into products (slug,name,description,category_id,base_price_cents,is_featured,tags,created_at) values
('dummy-sandal','Cross-Strap Slide Sandal','Vegan leather. Moulded footbed. Lightweight.', _sho,19900,true,'{new,summer}',_now - interval '3 hours') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CSS-TAN-6','Tan / UK 6','{"colour":"Tan","size":"UK 6"}',14),(_pid,'CSS-BLK-7','Black / UK 7','{"colour":"Black","size":"UK 7"}',10);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&h=600&fit=crop',0);

-- 13 Ceramic Vase Set (Home Decor)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
('dummy-vase-set','Ceramic Vase Set','Set of 2 hand-thrown. Matte glaze. 22+30cm.', _dec,25900,32900,'{new}',_now - interval '5 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CVS-NTR','Neutral / Set of 2','{}',8);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&h=600&fit=crop',0);

-- 14 LED Candle Set (Home Decor)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-led-candles','Flameless LED Candle Set','Set of 3. Remote control. Timer function.', _dec,18900,'{bestseller}',_now - interval '6 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'LCS-IVR','Ivory / Set of 3','{}',22);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&h=600&fit=crop',0);

-- 15 Leather Crossbody (Bags, featured)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
('dummy-crossbody-bag','Vintage Leather Crossbody','Full-grain leather. Brass hardware. Cotton-lined.', _bag,54900,69900,true,'{new,premium}',_now - interval '7 hours') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'VLC-COG','Cognac','{"colour":"Cognac"}',5),(_pid,'VLC-BLK','Black','{"colour":"Black"}',4);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop',0);

-- 16 Canvas Tote (Bags)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-tote-bag','Heavy Canvas Tote','18oz canvas. Reinforced handles. Fits laptop.', _bag,15900,'{bestseller}',_now - interval '4 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'HCT-NAT','Natural','{}',30),(_pid,'HCT-BLK','Black','{}',25);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&h=600&fit=crop',0);

-- 17 Blackout Curtain (Curtains)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
('dummy-blackout-curtain','Thermal Blackout Curtain','Blocks 99% light. Triple-weave. Grommet top.', _cur,22900,28900,'{new,bestseller}',_now - interval '3 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'TBC-GRY','Grey / 140x220cm','{"colour":"Grey"}',15),(_pid,'TBC-NVY','Navy / 140x220cm','{"colour":"Navy"}',10);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=600&fit=crop',0);

-- 18 Sheer Curtain (Curtains)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-sheer-curtain','Sheer Voile Curtain','Airy sheer. Softens daylight. Rod pocket.', _cur,11900,'{new}',_now - interval '6 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SVC-WHT','White / 140x250cm','{"colour":"White"}',20);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1505693314120-0d443367891c?w=600&h=600&fit=crop',0);

-- 19 Reed Diffuser (Everyday Essentials)
insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
('dummy-reed-diffuser','Reed Diffuser Set','200ml. Rattan sticks. 3 scents available.', _ess,14900,18900,'{bestseller}',_now - interval '2 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'RDF-VNC','Vanilla Cedar','{"scent":"Vanilla"}',25),(_pid,'RDF-WFG','Wild Fig','{"scent":"Fig"}',20);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop',0);

-- 20 Pencil Case Set (Back to School)
insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
('dummy-pencil-set','Stationery Set','A5 notebook + pens + highlighters + pencil case. Ready for school.', _sch,8900,'{new}',_now - interval '7 days') returning id into _pid;
insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SS-BLU','Blue Theme','{"colour":"Blue"}',40),(_pid,'SS-PNK','Pink Theme','{"colour":"Pink"}',35);
insert into product_images (product_id,url,sort_order) values (_pid,'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop',0);

end;
$$;
