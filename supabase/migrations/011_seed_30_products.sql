-- 011_seed_30_products.sql — Self-contained, robust seed for the Trends meeting.
-- Idempotent: cleans up demo/dummy first, then re-inserts 30 products + variants + images.

-- =====================================================================
-- STEP 1: Clean up any prior demo/dummy state
-- =====================================================================
delete from cart_items
  where variant_id in (
    select pv.id from product_variants pv
    left join products p on p.id = pv.product_id
    where p.id is null or p.slug like 'demo-%' or p.slug like 'dummy-%'
  );
delete from order_items
  where variant_id in (
    select pv.id from product_variants pv
    left join products p on p.id = pv.product_id
    where p.id is null or p.slug like 'demo-%' or p.slug like 'dummy-%'
  );
delete from reviews
  where product_id in (select id from products where slug like 'demo-%' or slug like 'dummy-%');
delete from reviews where customer_id = '00000000-0000-0000-0000-000000000001';
delete from product_images
  where product_id in (select id from products where slug like 'demo-%' or slug like 'dummy-%');
delete from product_variants
  where product_id in (select id from products where slug like 'demo-%' or slug like 'dummy-%')
  or product_id not in (select id from products);
delete from products
  where slug like 'demo-%' or slug like 'dummy-%'
  or id not in (select distinct product_id from product_variants);

-- =====================================================================
-- STEP 2: auth.users sentinel (must precede customers for FK)
-- =====================================================================
insert into auth.users (
  id, instance_id, aud, role, email,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo-reviews@breeez.internal',
  now(), '{}', '{}',
  now(), now()
)
on conflict (id) do nothing;

-- =====================================================================
-- STEP 3: customers sentinel
-- =====================================================================
insert into customers (id, email, created_at)
values ('00000000-0000-0000-0000-000000000001', 'demo-reviews@breeez.internal', now())
on conflict (id) do nothing;

-- =====================================================================
-- STEP 4: 30 products + variants + images
-- =====================================================================
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

  _imgs text[] := array[
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c62ea9bc?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1505693314120-0d443367891c?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1546863211-acd07f8d3f06?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1572635196237-14b3f28103ed?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1576566588028-5517d4071bf4?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1545239351-cefa43af60f3?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542293787938-c9e332b85c9c?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909211-d5fd1c5c5d2f?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556228720-da4e85a4ba42?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542219550-37144d6d4f8a?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1564585222527-c2777a5b5d3a?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1574180566232-aaad1b5de845?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542219550-37144d6d4f8a?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c62ea9bc?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1545239351-cefa43af60f3?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1572635196237-14b3f28103ed?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1576566588028-5517d4071bf4?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909211-d5fd1c5c5d2f?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542293787938-c9e332b85c9c?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556228720-da4e85a4ba42?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556228578-90e30a4a5d8f?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1574180566232-aaad1b5de845?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1542736667-06969b391db0?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1503602642458-6e1f61866a3e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1556909114-44e1f4c5e2c5?w=800&h=800&fit=crop'
  ];
begin
  -- APPAREL (1-5)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
  ('demo-linen-shirt','Oversized Linen Shirt','100% linen relaxed fit. Mother-of-pearl buttons. Roll-tab sleeves. Perfect for SA summer.', _app,34900,44900,true,'{new,summer,bestseller}',_now - interval '4 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'OLS-WHT-S','White / S','{"colour":"White","size":"S"}',12),(_pid,'OLS-WHT-M','White / M','{"colour":"White","size":"M"}',15),(_pid,'OLS-WHT-L','White / L','{"colour":"White","size":"L"}',10),(_pid,'OLS-SND-M','Sand / M','{"colour":"Sand","size":"M"}',8),(_pid,'OLS-SND-L','Sand / L','{"colour":"Sand","size":"L"}',5);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[1],0),(_pid,_imgs[2],1);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-knit-tank','Ribbed Knit Tank','Soft cotton-modal blend. High neck racerback. Layer or solo.', _app,16900,'{new,sale,bestseller}',_now - interval '12 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'RKT-BLK-XS','Black / XS','{"colour":"Black","size":"XS"}',14),(_pid,'RKT-BLK-S','Black / S','{"colour":"Black","size":"S"}',20),(_pid,'RKT-BLK-M','Black / M','{"colour":"Black","size":"M"}',18),(_pid,'RKT-WHT-M','White / M','{"colour":"White","size":"M"}',15),(_pid,'RKT-WHT-L','White / L','{"colour":"White","size":"L"}',10);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[3],0),(_pid,_imgs[4],1);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-cargo-pant','Relaxed Cargo Pant','Cotton twill. Tapered leg. Drawstring waist. Side cargo pockets.', _app,28900,34900,'{new,streetwear}',_now - interval '1 day') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'RCP-OLV-30','Olive / 30','{"colour":"Olive","size":"30"}',10),(_pid,'RCP-OLV-32','Olive / 32','{"colour":"Olive","size":"32"}',8),(_pid,'RCP-BLK-32','Black / 32','{"colour":"Black","size":"32"}',5),(_pid,'RCP-BLK-34','Black / 34','{"colour":"Black","size":"34"}',6);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[5],0);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-crew-sweater','Merino Crew Neck Sweater','100% merino wool. Ribbed cuffs and hem. Machine washable.', _app,49900,59900,'{new,premium}',_now - interval '6 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'MCS-CHR-M','Charcoal / M','{"colour":"Charcoal","size":"M"}',10),(_pid,'MCS-CHR-L','Charcoal / L','{"colour":"Charcoal","size":"L"}',8),(_pid,'MCS-NVY-L','Navy / L','{"colour":"Navy","size":"L"}',12),(_pid,'MCS-NVY-XL','Navy / XL','{"colour":"Navy","size":"XL"}',6);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[6],0),(_pid,_imgs[7],1);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-mom-jeans','High-Rise Mom Jeans','100% cotton denim. Vintage wash. Five-pocket styling.', _app,32900,39900,'{new,bestseller}',_now - interval '2 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'HMJ-IND-28','Indigo / 28','{"colour":"Indigo","size":"28"}',10),(_pid,'HMJ-IND-30','Indigo / 30','{"colour":"Indigo","size":"30"}',14),(_pid,'HMJ-IND-32','Indigo / 32','{"colour":"Indigo","size":"32"}',8),(_pid,'HMJ-LBL-30','Light Blue / 30','{"colour":"Light Blue","size":"30"}',6);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[8],0),(_pid,_imgs[9],1);

  -- KITCHEN (6-9)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
  ('demo-dutch-oven','Enamel Cast Iron Dutch Oven','5.5L pot. Oven-safe 260C. Perfect for potjiekos and slow roasts.', _kit,79900,99900,true,'{new,premium,bestseller}',_now - interval '8 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CIDO-RED-55','Cherry Red / 5.5L','{"colour":"Red","size":"5.5L"}',4),(_pid,'CIDO-BLU-55','Navy Blue / 5.5L','{"colour":"Blue","size":"5.5L"}',3),(_pid,'CIDO-CRM-55','Cream / 5.5L','{"colour":"Cream","size":"5.5L"}',5);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[10],0),(_pid,_imgs[11],1),(_pid,_imgs[12],2);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-cutting-board','Bamboo Cutting Board Set','Set of 3 (S/M/L). Knife-friendly surface. Juice groove.', _kit,24900,'{sale,bestseller}',_now - interval '2 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'BCB-3SET','3-Piece Set','{}',25);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[13],0);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-steel-kettle','Stainless Steel Whistling Kettle','2L mirror finish. Induction compatible. Stay-cool handle.', _kit,19900,26900,'{bestseller}',_now - interval '3 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SSK-SLV-2L','Silver','{"colour":"Silver"}',30);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[14],0);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-dinner-set','Stoneware Dinnerware Set','16-piece set. Microwave and dishwasher safe. Matte finish.', _kit,89900,109900,'{new,bestseller}',_now - interval '5 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CDS-CRM','Cream','{"colour":"Cream"}',8),(_pid,'CDS-GRY','Slate Grey','{"colour":"Grey"}',6);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[15],0),(_pid,_imgs[16],1);

  -- BEDROOM (10-12)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
  ('demo-duvet-set','Stonewashed Linen Duvet Set','Full set: cover + 2 pillowcases. French flax linen. Gets softer with each wash.', _bed,64900,84900,true,'{new,premium}',_now - interval '10 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SLD-QUE-OAT','Queen / Oatmeal','{"size":"Queen","colour":"Oatmeal"}',6),(_pid,'SLD-QUE-WHT','Queen / White','{"size":"Queen","colour":"White"}',5),(_pid,'SLD-KNG-CHR','King / Charcoal','{"size":"King","colour":"Charcoal"}',4),(_pid,'SLD-KNG-OAT','King / Oatmeal','{"size":"King","colour":"Oatmeal"}',3);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[17],0),(_pid,_imgs[18],1);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-throw-blanket','Chunky Knit Throw Blanket','Hand-knit cotton blend. 130x170cm. Reversible design.', _bed,39900,'{bestseller}',_now - interval '4 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CKB-CRM','Cream','{"colour":"Cream"}',12),(_pid,'CKB-CHR','Charcoal','{"colour":"Charcoal"}',8),(_pid,'CKB-OCN','Ocean','{"colour":"Ocean"}',5);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[19],0);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-memory-pillow','Memory Foam Pillow','Contoured support. Cooling gel layer. Hypoallergenic cover.', _bed,34900,44900,'{new,bestseller}',_now - interval '3 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'MFP-STD','Standard','{"size":"Standard"}',20),(_pid,'MFP-KNG','King','{"size":"King"}',15);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[20],0),(_pid,_imgs[21],1);

  -- BATHROOM (13-15)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
  ('demo-towel-set','Egyptian Cotton Towel Set','Set of 2. 600 GSM. Quick-drying. Long-staple cotton.', _bat,29900,39900,true,'{new,bestseller}',_now - interval '5 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'BTS-WHT','White / Set of 2','{"colour":"White"}',20),(_pid,'BTS-GRY','Grey / Set of 2','{"colour":"Grey"}',15),(_pid,'BTS-SGE','Sage / Set of 2','{"colour":"Sage"}',10);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[22],0),(_pid,_imgs[23],1);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-bath-mat','Bamboo Slatted Bath Mat','Anti-slip feet. Water-resistant finish. Spa aesthetic.', _bat,17900,'{new}',_now - interval '2 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'BBM-NAT','Natural','{"colour":"Natural"}',18);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[24],0);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-aroma-diffuser','Ultrasonic Aroma Diffuser','200ml tank. 7-colour mood light. Whisper-quiet 25dB.', _bat,22900,'{new,bestseller}',_now - interval '8 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'UAD-WHT','White','{"colour":"White"}',25),(_pid,'UAD-WAL','Walnut Wood','{"colour":"Walnut"}',15);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[25],0),(_pid,_imgs[26],1);

  -- SHOES (16-17)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-sneaker','Classic Canvas Sneaker','Low-top canvas. Vulcanised sole. Metal eyelets.', _sho,27900,34900,'{new,bestseller}',_now - interval '1 day') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CCS-WHT-7','White / UK 7','{"colour":"White","size":"UK 7"}',10),(_pid,'CCS-WHT-8','White / UK 8','{"colour":"White","size":"UK 8"}',12),(_pid,'CCS-BLK-8','Black / UK 8','{"colour":"Black","size":"UK 8"}',6),(_pid,'CCS-NVY-9','Navy / UK 9','{"colour":"Navy","size":"UK 9"}',8);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[27],0),(_pid,_imgs[28],1);

  insert into products (slug,name,description,category_id,base_price_cents,is_featured,tags,created_at) values
  ('demo-sandal','Cross-Strap Slide Sandal','Vegan leather. Moulded footbed. Lightweight EVA outsole.', _sho,19900,true,'{new,summer}',_now - interval '3 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CSS-TAN-6','Tan / UK 6','{"colour":"Tan","size":"UK 6"}',14),(_pid,'CSS-TAN-7','Tan / UK 7','{"colour":"Tan","size":"UK 7"}',12),(_pid,'CSS-BLK-7','Black / UK 7','{"colour":"Black","size":"UK 7"}',10),(_pid,'CSS-BLK-8','Black / UK 8','{"colour":"Black","size":"UK 8"}',8);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[29],0),(_pid,_imgs[30],1);

  -- HOME DECOR (18-20)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-vase-set','Ceramic Vase Set','Set of 2 hand-thrown. Matte glaze. 22+30cm. Watertight.', _dec,25900,32900,'{new}',_now - interval '5 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CVS-NTR','Neutral / Set of 2','{"colour":"Neutral"}',8);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[31],0),(_pid,_imgs[32],1);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-led-candles','Flameless LED Candle Set','Set of 3. Remote control. Timer function. Realistic flicker.', _dec,18900,'{bestseller}',_now - interval '6 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'LCS-IVR','Ivory / Set of 3','{"colour":"Ivory"}',22);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[33],0);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-botanical-print','Framed Botanical Print','A3 size. Solid oak frame. UV-protected glass. SA flora series.', _dec,14900,'{new,bestseller}',_now - interval '2 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'FBP-FRN','Fern','{"art":"Fern"}',12),(_pid,'FBP-PRO','Protea','{"art":"Protea"}',10),(_pid,'FBP-ALO','Aloe','{"art":"Aloe"}',8);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[34],0),(_pid,_imgs[35],1);

  -- BAGS (21-23)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,is_featured,tags,created_at) values
  ('demo-crossbody-bag','Vintage Leather Crossbody','Full-grain leather. Brass hardware. Cotton-lined. Adjustable strap.', _bag,54900,69900,true,'{new,premium}',_now - interval '7 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'VLC-COG','Cognac','{"colour":"Cognac"}',5),(_pid,'VLC-BLK','Black','{"colour":"Black"}',4),(_pid,'VLC-TAN','Tan','{"colour":"Tan"}',3);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[36],0),(_pid,_imgs[37],1);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-tote-bag','Heavy Canvas Tote','18oz canvas. Reinforced handles. Fits 15" laptop. Reinforced bottom.', _bag,15900,'{bestseller}',_now - interval '4 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'HCT-NAT','Natural','{"colour":"Natural"}',30),(_pid,'HCT-BLK','Black','{"colour":"Black"}',25),(_pid,'HCT-OLV','Olive','{"colour":"Olive"}',15);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[38],0);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-backpack','Canvas Roll-Top Backpack','Waxed canvas. Leather trim. 18L capacity. Laptop sleeve.', _bag,49900,62900,'{new,bestseller}',_now - interval '4 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'CRB-OLV','Olive','{"colour":"Olive"}',15),(_pid,'CRB-BLK','Black','{"colour":"Black"}',10),(_pid,'CRB-COG','Cognac','{"colour":"Cognac"}',8);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[39],0),(_pid,_imgs[40],1);

  -- CURTAINS (24-25)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-blackout-curtain','Thermal Blackout Curtain','Blocks 99% light. Triple-weave. Grommet top. 140x220cm.', _cur,22900,28900,'{new,bestseller}',_now - interval '3 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'TBC-GRY','Grey / 140x220cm','{"colour":"Grey"}',15),(_pid,'TBC-NVY','Navy / 140x220cm','{"colour":"Navy"}',10),(_pid,'TBC-IVO','Ivory / 140x220cm','{"colour":"Ivory"}',8);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[41],0);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-sheer-curtain','Linen Sheer Curtain','Softens daylight. Rod pocket. 140x250cm. Airy linen blend.', _cur,11900,'{new}',_now - interval '6 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SVC-WHT','White / 140x250cm','{"colour":"White"}',20),(_pid,'SVC-IVO','Ivory / 140x250cm','{"colour":"Ivory"}',15);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[42],0),(_pid,_imgs[43],1);

  -- EVERYDAY ESSENTIALS (26)
  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-reed-diffuser','Reed Diffuser Set','200ml. Rattan sticks. 3 scents. Lasts 8-12 weeks.', _ess,14900,18900,'{bestseller}',_now - interval '2 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'RDF-VNC','Vanilla Cedar','{"scent":"Vanilla"}',25),(_pid,'RDF-WFG','Wild Fig','{"scent":"Fig"}',20),(_pid,'RDF-ROS','Rose Garden','{"scent":"Rose"}',15);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[44],0);

  -- BACK TO SCHOOL (27-30)
  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-pencil-set','Stationery Set','A5 notebook + pens + highlighters + pencil case. Ready for school.', _sch,8900,'{new}',_now - interval '7 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SS-BLU','Blue Theme','{"colour":"Blue"}',40),(_pid,'SS-PNK','Pink Theme','{"colour":"Pink"}',35),(_pid,'SS-MNT','Mint Theme','{"colour":"Mint"}',20);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[45],0);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-lunch-bag','Insulated Lunch Bag','Keeps food cold 6+ hours. Leak-proof lining. Easy-clean interior.', _sch,12900,15900,'{new,bestseller}',_now - interval '1 day') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'ILB-NAV','Navy','{"colour":"Navy"}',25),(_pid,'ILB-RED','Red','{"colour":"Red"}',20),(_pid,'ILB-MNT','Mint','{"colour":"Mint"}',18);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[46],0),(_pid,_imgs[47],1);

  insert into products (slug,name,description,category_id,base_price_cents,tags,created_at) values
  ('demo-water-bottle','Insulated Water Bottle','500ml double-walled. Keeps cold 24h, hot 12h. BPA-free.', _sch,14900,'{new,bestseller}',_now - interval '5 hours') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SWB-SLV','Silver','{"colour":"Silver"}',30),(_pid,'SWB-MNT','Mint','{"colour":"Mint"}',25),(_pid,'SWB-BLK','Black','{"colour":"Black"}',20);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[48],0);

  insert into products (slug,name,description,category_id,base_price_cents,compare_at_cents,tags,created_at) values
  ('demo-school-bag','School Backpack','Ergonomic padded straps. 25L capacity. Water-resistant base.', _sch,79900,99900,'{bestseller}',_now - interval '3 days') returning id into _pid;
  insert into product_variants (product_id,sku,name,options,stock) values (_pid,'SBP-NVY','Navy','{"colour":"Navy"}',12),(_pid,'SBP-BLK','Black','{"colour":"Black"}',10),(_pid,'SBP-GRY','Grey','{"colour":"Grey"}',8);
  insert into product_images (product_id,url,sort_order) values (_pid,_imgs[49],0),(_pid,_imgs[50],1);
end;
$$;
