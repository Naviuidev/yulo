-- YULO production schema sync (safe to re-run)
-- Run in phpMyAdmin on production DB (e.g. yulowear1_123):
--   1. Select the database on the left
--   2. Import this file OR paste into SQL tab → Go
--
-- Covers gaps vs localhost for Cashfree + order emails + tracking followups.
-- Does NOT drop data. Does NOT overwrite settings/orders.

SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- 1) orders.payment_method must accept cashfree + paytm + razorpay + payu
-- ---------------------------------------------------------------------------
ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM('phonepe', 'stripe', 'cod', 'upi', 'cashfree', 'paytm', 'razorpay', 'payu') NULL;

-- ---------------------------------------------------------------------------
-- 2) orders.email_notified_at (invoice / owner notify guard)
-- ---------------------------------------------------------------------------
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'email_notified_at'
    ),
    'SELECT ''orders.email_notified_at already exists'' AS info',
    'ALTER TABLE orders ADD COLUMN email_notified_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 3) home_sections flash-sale schedule columns (if older prod DB)
-- ---------------------------------------------------------------------------
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_start_date'
    ),
    'SELECT ''sale_start_date already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_start_date DATE NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_end_date'
    ),
    'SELECT ''sale_end_date already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_end_date DATE NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_start_time'
    ),
    'SELECT ''sale_start_time already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_start_time TIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_end_time'
    ),
    'SELECT ''sale_end_time already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_end_time TIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'is_locked'
    ),
    'SELECT ''is_locked already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE home_sections SET is_locked = 1 WHERE slug = 'flash-sale';

-- ---------------------------------------------------------------------------
-- 4) tracking_followups (customer Raise query → admin Followups)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tracking_followups (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    customer_name VARCHAR(255) NULL,
    customer_email VARCHAR(255) NULL,
    customer_phone VARCHAR(30) NULL,
    status ENUM('pending', 'shared_response') NOT NULL DEFAULT 'pending',
    tracking_number VARCHAR(255) NULL,
    carrier VARCHAR(100) NULL,
    admin_notes TEXT NULL,
    responded_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_followups_status (status),
    INDEX idx_followups_order (order_id),
    INDEX idx_followups_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5) products.gst_applicable (admin product GST toggle)
-- ---------------------------------------------------------------------------
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'gst_applicable'
    ),
    'SELECT ''products.gst_applicable already exists'' AS info',
    'ALTER TABLE products ADD COLUMN gst_applicable TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 5b) product commerce options (shipping / colors / size)
-- ---------------------------------------------------------------------------
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='custom_shipping'),
    'SELECT ''custom_shipping already exists'' AS info',
    'ALTER TABLE products ADD COLUMN custom_shipping TINYINT(1) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='shipping_price'),
    'SELECT ''shipping_price already exists'' AS info',
    'ALTER TABLE products ADD COLUMN shipping_price DECIMAL(12,2) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='has_color_variants'),
    'SELECT ''has_color_variants already exists'' AS info',
    'ALTER TABLE products ADD COLUMN has_color_variants TINYINT(1) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='colors'),
    'SELECT ''colors already exists'' AS info',
    'ALTER TABLE products ADD COLUMN colors JSON NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='size_option'),
    'SELECT ''size_option already exists'' AS info',
    'ALTER TABLE products ADD COLUMN size_option VARCHAR(10) NOT NULL DEFAULT ''none'''
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='sizes'),
    'SELECT ''sizes already exists'' AS info',
    'ALTER TABLE products ADD COLUMN sizes JSON NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 5c) cart_items / order_items color + size
-- ---------------------------------------------------------------------------
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cart_items' AND COLUMN_NAME='color'),
    'SELECT ''cart_items.color already exists'' AS info',
    'ALTER TABLE cart_items ADD COLUMN color VARCHAR(100) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cart_items' AND COLUMN_NAME='size'),
    'SELECT ''cart_items.size already exists'' AS info',
    'ALTER TABLE cart_items ADD COLUMN size VARCHAR(20) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='order_items' AND COLUMN_NAME='color'),
    'SELECT ''order_items.color already exists'' AS info',
    'ALTER TABLE order_items ADD COLUMN color VARCHAR(100) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='order_items' AND COLUMN_NAME='size'),
    'SELECT ''order_items.size already exists'' AS info',
    'ALTER TABLE order_items ADD COLUMN size VARCHAR(20) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Storefront visitor page views (admin /visitors)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitor_page_views (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visitor_id CHAR(36) NOT NULL,
    session_id CHAR(36) NOT NULL,
    user_id INT UNSIGNED NULL,
    path VARCHAR(500) NOT NULL,
    title VARCHAR(255) NULL,
    referrer VARCHAR(500) NULL,
    device_type VARCHAR(20) NOT NULL DEFAULT 'desktop',
    user_agent VARCHAR(500) NULL,
    ip_hash CHAR(64) NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_vpv_created (created_at),
    INDEX idx_vpv_visitor (visitor_id),
    INDEX idx_vpv_session (session_id),
    INDEX idx_vpv_path (path(191)),
    INDEX idx_vpv_device (device_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_notification_reads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    item_key VARCHAR(120) NOT NULL,
    read_at DATETIME NOT NULL,
    UNIQUE KEY uk_admin_notif_read (user_id, item_key),
    INDEX idx_admin_notif_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SHOW TABLES LIKE 'tracking_followups';
-- SHOW COLUMNS FROM orders LIKE 'email_notified_at';
-- SHOW COLUMNS FROM orders LIKE 'payment_method';
-- SHOW COLUMNS FROM home_sections LIKE 'sale_%';
-- SHOW COLUMNS FROM products LIKE 'gst_applicable';
-- SHOW TABLES LIKE 'visitor_page_views';
-- SHOW TABLES LIKE 'admin_notification_reads';
