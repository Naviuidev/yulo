-- =============================================================================
-- YULO production deploy — payment gateways (Paytm / Razorpay / PayU / Cashfree)
-- =============================================================================
-- Run once in phpMyAdmin (or mysql CLI) on the PRODUCTION database BEFORE or
-- right after deploying the latest API + admin + storefront code.
--
-- Safe to re-run. Does NOT drop data. Does NOT insert secrets.
--
-- After this SQL:
--   1. Deploy backend + admin + frontend
--   2. Confirm production .env has APP_URL + FRONTEND_URL (public HTTPS)
--   3. Admin → Payments → save gateway credentials → Test → Publish ONE gateway
--
-- Verify:
--   SHOW COLUMNS FROM orders LIKE 'payment_method';
-- =============================================================================

SET @db := DATABASE();

-- ---------------------------------------------------------------------------
-- 1) orders.payment_method — accept all online gateways used by YULO
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2) payments table — only created if missing on a very old DB
--    (Matches schema.sql. Existing production tables are left unchanged.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  gateway_transaction_id VARCHAR(255) NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status ENUM('initiated', 'completed', 'failed', 'refunded') DEFAULT 'initiated',
  metadata JSON NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_payments_order_id (order_id),
  KEY idx_payments_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3) settings row for published gateway (empty until you Publish in Admin)
-- ---------------------------------------------------------------------------
INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
VALUES ('payment_published_gateway', '', 'payment', 1, NOW())
ON DUPLICATE KEY UPDATE
  `group` = 'payment',
  is_public = 1,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Done. Optional check:
--   SHOW COLUMNS FROM orders LIKE 'payment_method';
--   SELECT `key`, value FROM settings WHERE `key` = 'payment_published_gateway';
-- ---------------------------------------------------------------------------
SELECT 'production_payments_gateways.sql applied' AS info;
