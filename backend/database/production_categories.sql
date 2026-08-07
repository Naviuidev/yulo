-- Quick category seed for production (import into your existing DB in phpMyAdmin)
-- Select database yulowear1_123 first, then Import this file.

INSERT INTO categories (name, slug, parent_id, description, image, sort_order, status, created_at, updated_at) VALUES
('Sunglasses', 'sunglasses', NULL, 'Premium sunglasses collection', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&q=80', 1, 'active', NOW(), NOW()),
('Optical', 'optical', NULL, 'Prescription optical frames', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80', 2, 'active', NOW(), NOW()),
('Round Frames', 'round-frames', NULL, 'Round spectacles and frames', 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80', 3, 'active', NOW(), NOW()),
('Classic', 'classic', NULL, 'Classic black frame eyewear', 'https://images.unsplash.com/photo-1556306510-31ca015374b0?w=400&q=80', 4, 'active', NOW(), NOW()),
('Lifestyle', 'lifestyle', NULL, 'Everyday lifestyle sunglasses', 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400&q=80', 5, 'active', NOW(), NOW()),
('Clear Frames', 'clear-frames', NULL, 'Transparent optical frames', 'https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=400&q=80', 6, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  image = VALUES(image),
  status = 'active',
  updated_at = NOW();
