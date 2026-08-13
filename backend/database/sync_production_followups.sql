-- YULO production schema sync (safe to re-run)
-- Run in phpMyAdmin on production DB (e.g. yulowear1_123):
--   1. Select the database on the left
--   2. Import this file OR paste into SQL tab → Go
--
-- Covers gaps vs localhost for Cashfree + order emails + tracking followups.
-- Does NOT drop data. Does NOT overwrite settings/orders.

SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- 1) orders.payment_method must accept cashfree
-- ---------------------------------------------------------------------------
ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM('phonepe', 'stripe', 'cod', 'upi', 'cashfree') NULL;

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
-- 5) Quick verification queries (run after import; review results)
-- ---------------------------------------------------------------------------
-- SHOW TABLES LIKE 'tracking_followups';
-- SHOW COLUMNS FROM orders LIKE 'email_notified_at';
-- SHOW COLUMNS FROM orders LIKE 'payment_method';
-- SHOW COLUMNS FROM home_sections LIKE 'sale_%';
