-- =============================================================================
-- YULO productionReady.sql  (DELTA for this release — safe to re-run)
-- =============================================================================
-- Compare vs PREVIOUS production deploy:
--   • backend/database/productionSync.sql  (last full additive sync)
--   • prior productionReady.sql            (staff licences / Admin Config)
--
-- Already on production if you imported those (do NOT re-need):
--   • home_sections, offer_strips, featured_collections, offer_cards
--   • tracking_followups, visitor_page_views, admin_notification_reads
--   • favicon settings, product/cart/order commerce columns, reviews avatar
--   • users.role staff + users.permissions + admin_staff_licences
--     (incl. status ENUM banned + deleted)
--
-- THIS FILE adds only what is NEW for Digital Marketing / opt-in:
--   1) marketing_campaigns table (triggered one-to-one + bulk sends log)
--   2) users.marketing_opt_in TINYINT(1) DEFAULT 1 (promo email consent)
--
-- How to import (phpMyAdmin):
--   1. Select production DB (e.g. yulowear1_123)
--   2. Import this file  OR  SQL tab → paste → Go
--   3. Run the VERIFY queries at the bottom
--
-- Does NOT drop/truncate data.
-- Does NOT reset master admin password.
-- =============================================================================

SET @db := DATABASE();

-- ###########################################################################
-- 1) marketing_campaigns (triggered digital marketing sends)
-- ###########################################################################
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  heading VARCHAR(255) NOT NULL,
  description TEXT NULL,
  banner_image VARCHAR(500) NULL,
  product_link VARCHAR(500) NULL,
  actual_price VARCHAR(50) NULL,
  offer_price VARCHAR(50) NULL,
  mode ENUM('one_to_one', 'bulk') NOT NULL DEFAULT 'one_to_one',
  audience_type ENUM('users', 'customers', 'subscribed') NOT NULL DEFAULT 'users',
  recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
  sent_count INT UNSIGNED NOT NULL DEFAULT 0,
  failed_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('sent', 'partial', 'failed') NOT NULL DEFAULT 'sent',
  triggered_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_marketing_campaigns_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ###########################################################################
-- 2) users.marketing_opt_in (default opted-in for promotions)
-- ###########################################################################
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'marketing_opt_in'
    ),
    'SELECT ''users.marketing_opt_in already exists'' AS info',
    'ALTER TABLE users ADD COLUMN marketing_opt_in TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================================================
-- VERIFY (run after import)
-- =============================================================================
-- SHOW TABLES LIKE 'marketing_campaigns';
-- SHOW COLUMNS FROM users LIKE 'marketing_opt_in';
--
-- Expect:
--   marketing_campaigns exists
--   marketing_opt_in TINYINT(1) NOT NULL DEFAULT 1
--
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'users'
--   AND COLUMN_NAME = 'marketing_opt_in';
--
-- DESCRIBE marketing_campaigns;
-- =============================================================================
