-- ============================================================================
-- YULO Premium Fashion eCommerce Platform
-- Seed Data (matches schema.sql column-for-column)
-- ============================================================================
-- Run order:
--   1. mysql -u root -p < schema.sql
--   2. mysql -u root -p yulo_db < seed.sql
--
-- Password hashes generated via PHP password_hash(PASSWORD_BCRYPT, cost 12).
-- To regenerate user password hashes, run:
--   php backend/database/seed_passwords.php
-- ============================================================================

USE yulo_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (only tables defined in schema.sql)
TRUNCATE TABLE rate_limits;
TRUNCATE TABLE inventory_logs;
TRUNCATE TABLE deliveries;
TRUNCATE TABLE delivery_partners;
TRUNCATE TABLE payments;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE wallet_transactions;
TRUNCATE TABLE wallets;
TRUNCATE TABLE rewards;
TRUNCATE TABLE recently_viewed;
TRUNCATE TABLE notifications;
TRUNCATE TABLE compare_lists;
TRUNCATE TABLE wishlists;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE carts;
TRUNCATE TABLE reviews;
TRUNCATE TABLE product_variants;
TRUNCATE TABLE product_images;
TRUNCATE TABLE products;
TRUNCATE TABLE coupons;
TRUNCATE TABLE addresses;
TRUNCATE TABLE newsletter_subscribers;
TRUNCATE TABLE contact_messages;
TRUNCATE TABLE cms_pages;
TRUNCATE TABLE settings;
TRUNCATE TABLE banners;
TRUNCATE TABLE faqs;
TRUNCATE TABLE blogs;
TRUNCATE TABLE brands;
TRUNCATE TABLE categories;
TRUNCATE TABLE email_verification_tokens;
TRUNCATE TABLE refresh_tokens;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- USERS
-- Admin: admin@yulo.com / Admin@123
-- Customer: customer@yulo.com / Customer@123
-- ============================================================================

INSERT INTO users (id, name, email, password, phone, role, status, email_verified_at, created_at, updated_at) VALUES
(1, 'YULO Admin', 'admin@yulo.com', '$2y$12$rOGJRs0AJZx1ZmXAiQdFt.16Sdh8NS8MpSSi95FxXk.zeeUc2Y/8G', '+919876543210', 'admin', 'active', NOW(), NOW(), NOW()),
(2, 'Demo Customer', 'customer@yulo.com', '$2y$12$aqKncUUzKmYQFC.nZ8Wyteq/aIpKXTD4gcgdI7NH5S4Z84yu9hhTO', '+919876543211', 'customer', 'active', NOW(), NOW(), NOW()),
(3, 'Priya Sharma', 'priya@example.com', '$2y$12$aqKncUUzKmYQFC.nZ8Wyteq/aIpKXTD4gcgdI7NH5S4Z84yu9hhTO', '+919876543213', 'customer', 'active', NOW(), NOW(), NOW());

-- ============================================================================
-- ADDRESSES
-- ============================================================================

INSERT INTO addresses (id, user_id, name, phone, address_line1, address_line2, city, state, pincode, country, type, is_default, created_at, updated_at) VALUES
(1, 2, 'Demo Customer', '+919876543211', '42 MG Road', 'Apartment 5B', 'Bangalore', 'Karnataka', '560001', 'India', 'both', 1, NOW(), NOW()),
(2, 2, 'Demo Customer', '+919876543211', 'Tech Park, Whitefield', 'Block C, Floor 3', 'Bangalore', 'Karnataka', '560066', 'India', 'shipping', 0, NOW(), NOW());

-- ============================================================================
-- WALLETS & REWARDS
-- ============================================================================

INSERT INTO wallets (id, user_id, balance, created_at, updated_at) VALUES
(1, 2, 500.00, NOW(), NOW());

INSERT INTO wallet_transactions (wallet_id, type, amount, description, created_at) VALUES
(1, 'credit', 500.00, 'Welcome wallet credit', NOW());

INSERT INTO rewards (user_id, points, type, description, created_at) VALUES
(2, 250, 'earned', 'Welcome bonus reward points', NOW()),
(2, 50, 'earned', 'Points earned on order #YULO-20250801-0001', NOW()),
(2, 50, 'redeemed', 'Points redeemed on checkout', NOW());

-- ============================================================================
-- CATEGORIES (6 parent + 5 subcategories)
-- ============================================================================

INSERT INTO categories (id, name, slug, parent_id, description, image, sort_order, status, created_at, updated_at) VALUES
(1, 'Men', 'men', NULL, 'Premium menswear collection', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&q=80', 1, 'active', NOW(), NOW()),
(2, 'Women', 'women', NULL, 'Elegant womenswear collection', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80', 2, 'active', NOW(), NOW()),
(3, 'Kids', 'kids', NULL, 'Stylish kids fashion', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80', 3, 'active', NOW(), NOW()),
(4, 'Accessories', 'accessories', NULL, 'Bags, belts, and more', 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80', 4, 'active', NOW(), NOW()),
(5, 'Footwear', 'footwear', NULL, 'Shoes, sneakers, and sandals', 'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=400&q=80', 5, 'active', NOW(), NOW()),
(6, 'Men Shirts', 'men-shirts', 1, 'Formal and casual shirts for men', 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400&q=80', 1, 'active', NOW(), NOW()),
(7, 'Men Trousers', 'men-trousers', 1, 'Trousers and chinos for men', 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=400&q=80', 2, 'active', NOW(), NOW()),
(8, 'Women Dresses', 'women-dresses', 2, 'Dresses and gowns for women', 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&q=80', 1, 'active', NOW(), NOW()),
(9, 'Women Tops', 'women-tops', 2, 'Blouses and tops for women', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&q=80', 2, 'active', NOW(), NOW()),
(10, 'Kids Boys', 'kids-boys', 3, 'Fashion for boys', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80', 1, 'active', NOW(), NOW()),
(11, 'Handbags', 'handbags', 4, 'Premium handbags', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80', 1, 'active', NOW(), NOW());

-- ============================================================================
-- BRANDS (5)
-- ============================================================================

INSERT INTO brands (id, name, slug, logo, description, status, created_at, updated_at) VALUES
(1, 'YULO', 'yulo', '/uploads/brands/yulo.png', 'YULO in-house premium fashion label', 'active', NOW(), NOW()),
(2, 'Aether', 'aether', '/uploads/brands/aether.png', 'Contemporary luxury streetwear', 'active', NOW(), NOW()),
(3, 'Lumen', 'lumen', '/uploads/brands/lumen.png', 'Minimalist modern essentials', 'active', NOW(), NOW()),
(4, 'Noir', 'noir', '/uploads/brands/noir.png', 'Dark elegance and evening wear', 'active', NOW(), NOW()),
(5, 'Velvet', 'velvet', '/uploads/brands/velvet.png', 'Soft luxury and premium fabrics', 'active', NOW(), NOW());

-- ============================================================================
-- PRODUCTS (14)
-- ============================================================================

INSERT INTO products (id, name, slug, description, short_description, sku, price, sale_price, stock, category_id, brand_id, status, is_featured, is_new, is_trending, is_bestseller, video_url, barcode, meta_title, meta_description, low_stock_threshold, created_at, updated_at) VALUES
(1, 'YULO Linen Classic Shirt', 'yulo-linen-classic-shirt',
 'Crafted from premium European linen, this classic shirt offers breathable comfort with a refined silhouette. Perfect for both office and weekend wear.',
 'Premium linen shirt with classic fit', 'YULO-MSH-001', 3499.00, 2499.00, 85, 6, 1, 'active', 1, 1, 1, 1, NULL, '8901234567001',
 'YULO Linen Classic Shirt | YULO', 'Shop the YULO Linen Classic Shirt — premium European linen for everyday elegance.', 10, NOW(), NOW()),

(2, 'YULO Slim Fit Chinos', 'yulo-slim-fit-chinos',
 'Tailored slim-fit chinos in stretch cotton blend. Features hidden comfort waistband and wrinkle-resistant finish.',
 'Slim fit chinos in stretch cotton', 'YULO-MTR-001', 2799.00, 1999.00, 120, 7, 1, 'active', 1, 0, 1, 1, NULL, '8901234567002',
 'YULO Slim Fit Chinos | YULO', 'Premium slim-fit chinos in stretch cotton blend.', 10, NOW(), NOW()),

(3, 'Aether Urban Oxford Shirt', 'aether-urban-oxford-shirt',
 'Modern oxford shirt with subtle texture. Button-down collar and curved hem for versatile styling.',
 'Urban oxford shirt with modern fit', 'AETH-MSH-001', 4299.00, 3299.00, 60, 6, 2, 'active', 1, 1, 1, 0, NULL, '8901234567003',
 'Aether Urban Oxford Shirt | YULO', 'Contemporary oxford shirt from Aether.', 8, NOW(), NOW()),

(4, 'Lumen Midi Silk Dress', 'lumen-midi-silk-dress',
 'Flowing midi dress in pure mulberry silk. Features adjustable waist tie and hidden side pockets.',
 'Pure silk midi dress', 'LUMN-WDR-001', 11999.00, 8999.00, 35, 8, 3, 'active', 1, 1, 1, 1, '/uploads/videos/lumen-dress.mp4', '8901234567004',
 'Lumen Midi Silk Dress | YULO', 'Luxurious mulberry silk midi dress by Lumen.', 5, NOW(), NOW()),

(5, 'Noir Satin Blouse', 'noir-satin-blouse',
 'Luxurious satin blouse with draped neckline. Perfect for evening occasions and power dressing.',
 'Satin blouse with draped neckline', 'NOIR-WTP-001', 5999.00, 4599.00, 45, 9, 4, 'active', 0, 1, 0, 0, NULL, '8901234567005',
 'Noir Satin Blouse | YULO', 'Elegant satin blouse from Noir.', 8, NOW(), NOW()),

(6, 'Velvet Wrap Maxi Dress', 'velvet-wrap-maxi-dress',
 'Sumptuous velvet wrap dress with flutter sleeves. Available in rich jewel tones.',
 'Velvet wrap maxi dress', 'VLVT-WDR-001', 9999.00, 7499.00, 28, 8, 5, 'active', 1, 0, 1, 1, NULL, '8901234567006',
 'Velvet Wrap Maxi Dress | YULO', 'Luxurious velvet wrap maxi dress.', 5, NOW(), NOW()),

(7, 'YULO Kids Cotton Polo', 'yulo-kids-cotton-polo',
 'Soft pique cotton polo for boys. Reinforced collar and easy-care fabric for active kids.',
 'Cotton polo for boys', 'YULO-KBY-001', 1699.00, 1299.00, 90, 10, 1, 'active', 0, 1, 0, 0, NULL, '8901234567007',
 'YULO Kids Cotton Polo | YULO', 'Comfortable cotton polo for boys.', 15, NOW(), NOW()),

(8, 'Aether Leather Sneakers', 'aether-leather-sneakers',
 'Handcrafted full-grain leather sneakers with cushioned insole. Minimal design meets maximum comfort.',
 'Handcrafted leather sneakers', 'AETH-FTW-001', 8999.00, 6999.00, 50, 5, 2, 'active', 1, 1, 1, 1, NULL, '8901234567008',
 'Aether Leather Sneakers | YULO', 'Handcrafted leather sneakers by Aether.', 8, NOW(), NOW()),

(9, 'Lumen Leather Tote Bag', 'lumen-leather-tote-bag',
 'Structured tote in vegetable-tanned leather. Fits laptop up to 15 inches with interior organizer.',
 'Vegetable-tanned leather tote', 'LUMN-ACC-001', 15999.00, 12999.00, 22, 11, 3, 'active', 1, 0, 1, 0, NULL, '8901234567009',
 'Lumen Leather Tote Bag | YULO', 'Premium vegetable-tanned leather tote.', 5, NOW(), NOW()),

(10, 'Noir Silk Scarf', 'noir-silk-scarf',
 '100% silk scarf with hand-rolled edges. Abstract print inspired by midnight cityscapes.',
 'Pure silk scarf with hand-rolled edges', 'NOIR-ACC-001', 4499.00, 3499.00, 65, 4, 4, 'active', 0, 1, 0, 0, NULL, '8901234567010',
 'Noir Silk Scarf | YULO', 'Pure silk scarf with hand-rolled edges.', 10, NOW(), NOW()),

(11, 'Velvet Block Heel Sandals', 'velvet-block-heel-sandals',
 'Elegant block heel sandals with padded footbed. Suede upper with gold hardware accents.',
 'Block heel sandals in suede', 'VLVT-FTW-001', 6999.00, 5499.00, 40, 5, 5, 'active', 1, 1, 1, 0, NULL, '8901234567011',
 'Velvet Block Heel Sandals | YULO', 'Elegant block heel sandals in suede.', 8, NOW(), NOW()),

(12, 'YULO Cashmere Blend Top', 'yulo-cashmere-blend-top',
 'Ultra-soft cashmere blend top with ribbed cuffs. Lightweight warmth for transitional seasons.',
 'Cashmere blend top', 'YULO-WTP-001', 5299.00, 3999.00, 55, 9, 1, 'active', 1, 0, 1, 1, NULL, '8901234567012',
 'YULO Cashmere Blend Top | YULO', 'Ultra-soft cashmere blend top.', 8, NOW(), NOW()),

(13, 'Aether Tailored Trousers', 'aether-tailored-trousers',
 'Precision-tailored trousers with flat front and tapered leg. Italian wool blend fabric.',
 'Italian wool blend tailored trousers', 'AETH-MTR-001', 7299.00, 5499.00, 42, 7, 2, 'active', 0, 1, 1, 0, NULL, '8901234567013',
 'Aether Tailored Trousers | YULO', 'Italian wool blend tailored trousers.', 6, NOW(), NOW()),

(14, 'YULO Floral Midi Dress', 'yulo-floral-midi-dress',
 'Romantic floral print midi dress in lightweight viscose. Smocked bodice with tiered skirt.',
 'Floral print midi dress', 'YULO-WDR-001', 4299.00, 3299.00, 70, 8, 1, 'active', 1, 1, 1, 1, NULL, '8901234567014',
 'YULO Floral Midi Dress | YULO', 'Romantic floral print midi dress.', 10, NOW(), NOW());

-- ============================================================================
-- PRODUCT IMAGES
-- ============================================================================

INSERT INTO product_images (product_id, image_path, is_primary, sort_order) VALUES
(1, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800', 1, 1),
(1, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', 0, 2),
(1, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800', 0, 3),
(2, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800', 1, 1),
(2, 'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=800', 0, 2),
(2, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800', 0, 3),
(3, 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=800', 1, 1),
(3, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800', 0, 2),
(3, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800', 0, 3),
(4, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', 1, 1),
(4, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800', 0, 2),
(4, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800', 0, 3),
(5, 'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=800', 1, 1),
(5, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800', 0, 2),
(5, 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=800', 0, 3),
(6, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800', 1, 1),
(6, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800', 0, 2),
(6, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', 0, 3),
(7, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800', 1, 1),
(7, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800', 0, 2),
(7, 'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=800', 0, 3),
(8, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800', 1, 1),
(8, 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=800', 0, 2),
(8, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800', 0, 3),
(9, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800', 1, 1),
(9, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', 0, 2),
(9, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800', 0, 3),
(10, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800', 1, 1),
(10, 'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=800', 0, 2),
(10, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800', 0, 3),
(11, 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=800', 1, 1),
(11, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800', 0, 2),
(11, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800', 0, 3),
(12, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', 1, 1),
(12, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800', 0, 2),
(12, 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800', 0, 3),
(13, 'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=800', 1, 1),
(13, 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800', 0, 2),
(13, 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=800', 0, 3),
(14, 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800', 1, 1),
(14, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800', 0, 2),
(14, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800', 0, 3);

-- ============================================================================
-- PRODUCT VARIANTS (attributes JSON: color + size)
-- ============================================================================

INSERT INTO product_variants (id, product_id, name, sku, price, sale_price, stock, attributes, status) VALUES
(1, 1, 'White / M', 'YULO-MSH-001-WHT-M', 3499.00, 2499.00, 25, '{"color":"White","size":"M"}', 'active'),
(2, 1, 'White / L', 'YULO-MSH-001-WHT-L', 3499.00, 2499.00, 20, '{"color":"White","size":"L"}', 'active'),
(3, 1, 'Sky Blue / M', 'YULO-MSH-001-BLU-M', 3499.00, 2499.00, 20, '{"color":"Sky Blue","size":"M"}', 'active'),
(4, 1, 'Sky Blue / L', 'YULO-MSH-001-BLU-L', 3499.00, 2499.00, 20, '{"color":"Sky Blue","size":"L"}', 'active'),
(5, 2, 'Khaki / 30', 'YULO-MTR-001-KHK-30', 2799.00, 1999.00, 30, '{"color":"Khaki","size":"30"}', 'active'),
(6, 2, 'Khaki / 32', 'YULO-MTR-001-KHK-32', 2799.00, 1999.00, 30, '{"color":"Khaki","size":"32"}', 'active'),
(7, 2, 'Navy / 32', 'YULO-MTR-001-NVY-32', 2799.00, 1999.00, 30, '{"color":"Navy","size":"32"}', 'active'),
(8, 2, 'Navy / 34', 'YULO-MTR-001-NVY-34', 2799.00, 1999.00, 30, '{"color":"Navy","size":"34"}', 'active'),
(9, 4, 'Emerald / S', 'LUMN-WDR-001-EMR-S', 11999.00, 8999.00, 10, '{"color":"Emerald","size":"S"}', 'active'),
(10, 4, 'Emerald / M', 'LUMN-WDR-001-EMR-M', 11999.00, 8999.00, 12, '{"color":"Emerald","size":"M"}', 'active'),
(11, 4, 'Black / M', 'LUMN-WDR-001-BLK-M', 11999.00, 8999.00, 13, '{"color":"Black","size":"M"}', 'active'),
(12, 8, 'White / 8', 'AETH-FTW-001-WHT-8', 8999.00, 6999.00, 15, '{"color":"White","size":"8"}', 'active'),
(13, 8, 'White / 9', 'AETH-FTW-001-WHT-9', 8999.00, 6999.00, 15, '{"color":"White","size":"9"}', 'active'),
(14, 8, 'Black / 9', 'AETH-FTW-001-BLK-9', 8999.00, 6999.00, 10, '{"color":"Black","size":"9"}', 'active'),
(15, 8, 'Black / 10', 'AETH-FTW-001-BLK-10', 8999.00, 6999.00, 10, '{"color":"Black","size":"10"}', 'active'),
(16, 11, 'Tan / 6', 'VLVT-FTW-001-TAN-6', 6999.00, 5499.00, 10, '{"color":"Tan","size":"6"}', 'active'),
(17, 11, 'Tan / 7', 'VLVT-FTW-001-TAN-7', 6999.00, 5499.00, 15, '{"color":"Tan","size":"7"}', 'active'),
(18, 11, 'Black / 7', 'VLVT-FTW-001-BLK-7', 6999.00, 5499.00, 15, '{"color":"Black","size":"7"}', 'active');

-- ============================================================================
-- REVIEWS
-- ============================================================================

INSERT INTO reviews (product_id, user_id, rating, title, comment, status, created_at, updated_at) VALUES
(1, 2, 5, 'Excellent quality linen', 'The fabric feels premium and breathes well in Bangalore heat. True to size.', 'approved', NOW(), NOW()),
(1, 3, 4, 'Great shirt, slightly long', 'Love the quality but runs a bit long for my height.', 'approved', NOW(), NOW()),
(4, 2, 5, 'Stunning dress', 'Wore this to a wedding and received so many compliments. Worth every rupee.', 'approved', NOW(), NOW()),
(8, 2, 5, 'Most comfortable sneakers', 'Leather quality is top notch. Can walk all day without discomfort.', 'approved', NOW(), NOW()),
(14, 3, 4, 'Beautiful print', 'Lovely floral pattern. Fabric is lightweight and perfect for summer.', 'approved', NOW(), NOW());

-- ============================================================================
-- COUPONS
-- ============================================================================

INSERT INTO coupons (id, code, type, value, min_order_amount, max_discount, max_uses, used_count, expires_at, status, created_at, updated_at) VALUES
(1, 'YULO10', 'percentage', 10.00, 999.00, 2000.00, 1000, 1, '2026-12-31 23:59:59', 'active', NOW(), NOW()),
(2, 'WELCOME500', 'fixed', 500.00, 2499.00, NULL, 500, 0, '2026-06-30 23:59:59', 'active', NOW(), NOW());

-- ============================================================================
-- DELIVERY PARTNERS
-- ============================================================================

INSERT INTO delivery_partners (id, name, code, contact_email, contact_phone, tracking_url, status, created_at, updated_at) VALUES
(1, 'BlueDart Express', 'bluedart', 'support@bluedart.com', '+918000123456', 'https://www.bluedart.com/track/{tracking_number}', 'active', NOW(), NOW()),
(2, 'Delhivery', 'delhivery', 'support@delhivery.com', '+918000234567', 'https://www.delhivery.com/track/{tracking_number}', 'active', NOW(), NOW()),
(3, 'YULO Express', 'yulo_express', 'logistics@yulo.com', '+918000345678', 'https://yulo.com/track/{tracking_number}', 'active', NOW(), NOW());

-- ============================================================================
-- SAMPLE ORDER
-- ============================================================================

INSERT INTO orders (id, user_id, order_number, status, subtotal, discount, shipping_charge, tax, total, coupon_id, payment_status, payment_method, shipping_address, billing_address, notes, created_at, updated_at) VALUES
(1, 2, 'YULO-20250801-0001', 'delivered', 5498.00, 549.80, 0.00, 989.64, 5937.84, 1, 'paid', 'phonepe',
 '{"name":"Demo Customer","phone":"+919876543211","address_line1":"42 MG Road","address_line2":"Apartment 5B","city":"Bangalore","state":"Karnataka","pincode":"560001","country":"India"}',
 '{"name":"Demo Customer","phone":"+919876543211","address_line1":"42 MG Road","address_line2":"Apartment 5B","city":"Bangalore","state":"Karnataka","pincode":"560001","country":"India"}',
 NULL, '2025-07-15 14:30:00', '2025-07-18 16:50:00');

INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, created_at) VALUES
(1, 1, 1, 1, 2499.00, 2499.00, '2025-07-15 14:30:00'),
(1, 2, 5, 1, 1999.00, 1999.00, '2025-07-15 14:30:00'),
(1, 10, NULL, 1, 1000.00, 1000.00, '2025-07-15 14:30:00');

INSERT INTO payments (order_id, gateway, transaction_id, gateway_transaction_id, amount, status, metadata, created_at, updated_at) VALUES
(1, 'phonepe', 'PP-TXN-202507151430001', 'PHONEPE-TXN-ABC123XYZ', 5937.84, 'completed', '{"method":"UPI","detail":"customer@ybl"}', '2025-07-15 14:30:00', '2025-07-15 14:30:00');

INSERT INTO deliveries (order_id, partner_id, carrier, tracking_number, otp, status, estimated_delivery, notes, created_at, updated_at) VALUES
(1, 1, 'BlueDart Express', 'BD123456789IN', '482916', 'delivered', '2025-07-18', 'Delivered and OTP verified', '2025-07-15 14:35:00', '2025-07-18 16:50:00');

-- ============================================================================
-- CART & WISHLIST
-- ============================================================================

INSERT INTO carts (id, user_id, session_id, created_at, updated_at) VALUES
(1, 2, NULL, NOW(), NOW());

INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price, created_at, updated_at) VALUES
(1, 4, 10, 1, 8999.00, NOW(), NOW());

INSERT INTO wishlists (user_id, product_id, created_at) VALUES
(2, 6, NOW()),
(2, 9, NOW()),
(2, 11, NOW());

-- ============================================================================
-- BANNERS
-- ============================================================================

INSERT INTO banners (id, title, image, link, position, sort_order, status, created_at, updated_at) VALUES
(1, 'Summer Collection 2025', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600', '/shop?category=men', 'home', 1, 'active', NOW(), NOW()),
(2, 'New Arrivals', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600', '/shop?is_new=1', 'home', 2, 'active', NOW(), NOW()),
(3, 'Free Shipping', '/uploads/banners/sidebar-free-shipping.jpg', '/pages/shipping-policy', 'sidebar', 1, 'active', NOW(), NOW()),
(4, 'Weekend Flash Sale', '/uploads/banners/popup-flash-sale.jpg', '/shop?is_trending=1', 'popup', 1, 'active', NOW(), NOW());

-- ============================================================================
-- FAQS
-- ============================================================================

INSERT INTO faqs (question, answer, category, sort_order, status, created_at, updated_at) VALUES
('How can I track my order?', 'Once your order is shipped, you will receive an email and SMS with a tracking link. You can also track your order from the My Orders section in your account.', 'Orders', 1, 'active', NOW(), NOW()),
('Can I modify or cancel my order?', 'Orders can be modified or cancelled within 1 hour of placement. After that, please contact our support team at support@yulo.com.', 'Orders', 2, 'active', NOW(), NOW()),
('What are the delivery timelines?', 'Standard delivery takes 3-5 business days for metro cities and 5-7 business days for other locations. Express delivery (1-2 days) is available in select cities.', 'Shipping', 1, 'active', NOW(), NOW()),
('Do you offer free shipping?', 'Yes! Free shipping is available on all orders above ₹1999. Orders below this amount incur a flat shipping fee of ₹99.', 'Shipping', 2, 'active', NOW(), NOW()),
('What is your return policy?', 'We offer a 15-day hassle-free return policy on unused items with original tags attached. Refunds are processed within 5-7 business days after we receive the returned item.', 'Returns', 1, 'active', NOW(), NOW()),
('How do I initiate a return?', 'Go to My Orders, select the order, and click "Return Item". Choose the item and reason for return. Our pickup partner will collect the item within 2-3 business days.', 'Returns', 2, 'active', NOW(), NOW()),
('Which payment methods do you accept?', 'We accept PhonePe, UPI, credit/debit cards via Stripe, Cash on Delivery (COD), and YULO Wallet. All online payments are secured with 256-bit encryption.', 'Payments', 1, 'active', NOW(), NOW()),
('How do I earn reward points?', 'Earn 1 point for every ₹10 spent. Sign up bonus: 250 points. Write a verified review: 50 points. Points can be redeemed at checkout (100 points = ₹10).', 'Account', 1, 'active', NOW(), NOW());

-- ============================================================================
-- BLOGS
-- ============================================================================

INSERT INTO blogs (title, slug, content, excerpt, image, author_id, status, published_at, created_at, updated_at) VALUES
('Top 5 Summer Fashion Trends for 2025', 'top-5-summer-fashion-trends-2025',
 '<p>Summer 2025 is all about breathable luxury. Linen continues to dominate menswear, while women embrace flowing silhouettes in silk and viscose.</p><p>Key trends include: oversized linen shirts, floral midi dresses, neutral-toned leather sneakers, and statement accessories in gold hardware.</p>',
 'From linen layers to bold prints, discover the trends defining premium summer fashion this year.',
 '/uploads/blogs/summer-trends-2025.jpg', 1, 'published', '2025-07-01 10:00:00', NOW(), NOW()),

('How to Style a Linen Shirt for Any Occasion', 'how-to-style-linen-shirt',
 '<p>Start with our YULO Linen Classic Shirt in white or sky blue. For office: tuck into tailored chinos with leather loafers. For weekend: leave untucked over slim jeans with sneakers.</p>',
 'The versatile linen shirt is a wardrobe essential. Here is how to dress it up or down.',
 '/uploads/blogs/style-linen-shirt.jpg', 1, 'published', '2025-07-10 09:00:00', NOW(), NOW()),

('YULO''s Commitment to Sustainable Fashion', 'yulo-sustainable-fashion-commitment',
 '<p>At YULO, sustainability is woven into every thread. We source European linen from certified farms, use vegetable-tanned leather, and ship in recyclable packaging.</p>',
 'Learn about our eco-friendly materials, ethical sourcing, and packaging initiatives.',
 '/uploads/blogs/sustainability.jpg', 1, 'published', '2025-07-20 11:00:00', NOW(), NOW());

-- ============================================================================
-- CMS PAGES
-- ============================================================================

INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status, created_at, updated_at) VALUES
('About Us', 'about-us', '<h1>About YULO</h1><p>YULO is India''s premier destination for luxury fashion. Founded in 2020, we curate the finest apparel, footwear, and accessories from in-house and partner brands.</p>', 'About Us | YULO', 'Learn about YULO — India''s premier luxury fashion destination.', 'published', NOW(), NOW()),
('Privacy Policy', 'privacy-policy', '<h1>Privacy Policy</h1><p>Your privacy is important to us. This policy explains how YULO collects, uses, and protects your personal information.</p>', 'Privacy Policy | YULO', 'YULO privacy policy and data protection practices.', 'published', NOW(), NOW()),
('Terms & Conditions', 'terms-and-conditions', '<h1>Terms & Conditions</h1><p>By using the YULO platform, you agree to these terms and conditions.</p>', 'Terms & Conditions | YULO', 'YULO terms and conditions of use.', 'published', NOW(), NOW()),
('Shipping Policy', 'shipping-policy', '<h1>Shipping Policy</h1><p>We ship across India. Standard delivery: 3-5 business days. Free shipping on orders above ₹1999.</p>', 'Shipping Policy | YULO', 'YULO shipping timelines and delivery information.', 'published', NOW(), NOW()),
('Return & Refund Policy', 'return-refund-policy', '<h1>Return & Refund Policy</h1><p>15-day hassle-free returns on unused items with tags. Refunds processed within 5-7 business days.</p>', 'Return & Refund Policy | YULO', 'YULO return and refund policy details.', 'published', NOW(), NOW());

-- ============================================================================
-- SETTINGS
-- ============================================================================

INSERT INTO settings (`key`, value, `group`, is_public, created_at, updated_at) VALUES
('site_name', 'YULO', 'general', 1, NOW(), NOW()),
('site_tagline', 'Premium Fashion, Redefined', 'general', 1, NOW(), NOW()),
('support_email', 'support@yulo.com', 'general', 1, NOW(), NOW()),
('support_phone', '+91 80 4567 8900', 'general', 1, NOW(), NOW()),
('currency', 'INR', 'general', 1, NOW(), NOW()),
('currency_symbol', '₹', 'general', 1, NOW(), NOW()),
('tax_rate', '18', 'tax', 0, NOW(), NOW()),
('free_shipping_threshold', '1999', 'shipping', 1, NOW(), NOW()),
('flat_shipping_rate', '99', 'shipping', 1, NOW(), NOW()),
('cod_enabled', 'true', 'payment', 0, NOW(), NOW()),
('cod_max_amount', '10000', 'payment', 0, NOW(), NOW()),
('reward_points_per_rupee', '0.1', 'rewards', 0, NOW(), NOW()),
('reward_redemption_rate', '0.1', 'rewards', 0, NOW(), NOW()),
('low_stock_notification', 'true', 'inventory', 0, NOW(), NOW()),
('meta_title', 'YULO - Premium Fashion eCommerce', 'seo', 1, NOW(), NOW()),
('meta_description', 'Shop premium fashion at YULO. Discover curated collections of apparel, footwear, and accessories.', 'seo', 1, NOW(), NOW()),
('social_instagram', 'https://instagram.com/yulofashion', 'social', 1, NOW(), NOW()),
('social_facebook', 'https://facebook.com/yulofashion', 'social', 1, NOW(), NOW());

-- ============================================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================================

INSERT INTO newsletter_subscribers (email, status, subscribed_at) VALUES
('customer@yulo.com', 'active', NOW()),
('fashionlover@example.com', 'active', NOW()),
('style@example.com', 'active', NOW());

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

INSERT INTO notifications (user_id, title, message, type, read_at, created_at) VALUES
(2, 'Order Delivered', 'Your order #YULO-20250801-0001 has been delivered successfully.', 'order_delivered', NOW(), NOW()),
(2, 'Weekend Flash Sale!', 'Up to 40% off on selected items. Shop now before it ends!', 'promotion', NULL, NOW()),
(2, 'Reward Points Earned', 'You earned 50 reward points on your recent purchase.', 'reward_earned', NULL, NOW());

-- ============================================================================
-- RECENTLY VIEWED
-- ============================================================================

INSERT INTO recently_viewed (user_id, product_id, viewed_at) VALUES
(2, 4, '2025-07-31 18:00:00'),
(2, 6, '2025-07-31 17:30:00'),
(2, 8, '2025-07-31 17:00:00'),
(2, 1, '2025-07-30 20:00:00');

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
