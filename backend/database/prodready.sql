-- =============================================================================
-- YULO prodready.sql  (DELTA for this release — safe to re-run)
-- =============================================================================
-- Compare vs PREVIOUS production imports:
--   • backend/database/productionSync.sql
--   • backend/database/productionReady.sql   (marketing_campaigns + opt-in)
--   • backend/database/production_payments_gateways.sql  (if already applied)
--
-- Already on production if you imported those (do NOT need again):
--   • home_sections, offer_strips, featured_collections, offer_cards
--   • tracking_followups, visitor_page_views, admin_notification_reads
--   • marketing_campaigns, users.marketing_opt_in
--   • staff licences / commerce columns / favicon / payment gateways ENUM
--
-- THIS FILE adds only what is NEW for COD / cancel / return / prepaid refunds:
--   1) products.cod_available
--   2) products.cancel_available
--   3) products.return_available
--   4) orders.delivered_at (+ backfill for existing delivered orders)
--   5) order_returns table
--   6) order_help_messages table
--   7) orders.payment_method ENUM refresh (all online gateways)
--   8) settings.payment_published_gateway (if missing)
--
-- How to import (phpMyAdmin):
--   1. Select production DB (e.g. yulowear1_123)
--   2. Import this file  OR  SQL tab → paste → Go
--   3. Run the VERIFY queries at the bottom
--
-- Does NOT drop/truncate data.
-- Does NOT reset admin password.
-- =============================================================================

SET @db := DATABASE();

-- ###########################################################################
-- 1) products.cod_available
-- ###########################################################################
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'cod_available'
    ),
    'SELECT ''products.cod_available already exists'' AS info',
    'ALTER TABLE products ADD COLUMN cod_available TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ###########################################################################
-- 2) products.cancel_available
-- ###########################################################################
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'cancel_available'
    ),
    'SELECT ''products.cancel_available already exists'' AS info',
    'ALTER TABLE products ADD COLUMN cancel_available TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ###########################################################################
-- 3) products.return_available
-- ###########################################################################
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'return_available'
    ),
    'SELECT ''products.return_available already exists'' AS info',
    'ALTER TABLE products ADD COLUMN return_available TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ###########################################################################
-- 4) orders.delivered_at (return window anchor)
-- ###########################################################################
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'delivered_at'
    ),
    'SELECT ''orders.delivered_at already exists'' AS info',
    'ALTER TABLE orders ADD COLUMN delivered_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Best-effort backfill so existing delivered orders get a return-window start.
UPDATE orders
SET delivered_at = updated_at
WHERE status = 'delivered'
  AND delivered_at IS NULL
  AND updated_at IS NOT NULL;

-- ###########################################################################
-- 5) order_returns
-- ###########################################################################
CREATE TABLE IF NOT EXISTS order_returns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('requested', 'in_process', 'completed', 'rejected') NOT NULL DEFAULT 'in_process',
  reason TEXT NULL,
  admin_notes TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_order_returns_order (order_id),
  INDEX idx_order_returns_user (user_id),
  INDEX idx_order_returns_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ###########################################################################
-- 6) order_help_messages (customer ↔ admin shared thread)
-- ###########################################################################
CREATE TABLE IF NOT EXISTS order_help_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  sender ENUM('customer', 'admin') NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_order_help_order (order_id),
  INDEX idx_order_help_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ###########################################################################
-- 7) orders.payment_method — all online gateways (idempotent MODIFY)
-- ###########################################################################
ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM(
    'phonepe',
    'stripe',
    'cod',
    'upi',
    'cashfree',
    'paytm',
    'razorpay',
    'payu'
  ) NULL;

-- ###########################################################################
-- 8) settings.payment_published_gateway (empty until Publish in Admin)
-- ###########################################################################
INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
VALUES ('payment_published_gateway', '', 'payment', 1, NOW())
ON DUPLICATE KEY UPDATE
  `group` = 'payment',
  is_public = 1,
  updated_at = NOW();

SELECT 'prodready.sql applied' AS info;

-- =============================================================================
-- VERIFY (run after import)
-- =============================================================================
-- SHOW COLUMNS FROM products LIKE 'cod_available';
-- SHOW COLUMNS FROM products LIKE 'cancel_available';
-- SHOW COLUMNS FROM products LIKE 'return_available';
-- SHOW COLUMNS FROM orders LIKE 'delivered_at';
-- SHOW TABLES LIKE 'order_returns';
-- SHOW TABLES LIKE 'order_help_messages';
-- SHOW COLUMNS FROM orders LIKE 'payment_method';
-- SELECT `key`, value, `group`, is_public FROM settings
--   WHERE `key` = 'payment_published_gateway';
--
-- Expect:
--   cod_available / cancel_available / return_available = TINYINT(1) DEFAULT 1
--   delivered_at DATETIME NULL
--   order_returns + order_help_messages exist
--   payment_method includes cashfree, paytm, razorpay, payu
-- =============================================================================
