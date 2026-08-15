-- =============================================================================
-- YULO productionReady.sql  (DELTA for this release — safe to re-run)
-- =============================================================================
-- Compare vs last deploy file: backend/database/productionSync.sql
--
-- Last productionSync already covered (skip if already imported):
--   • home_sections, offer_strips, featured_collections, offer_cards
--   • tracking_followups, visitor_page_views, admin_notification_reads
--   • favicon settings, product/cart/order commerce columns, reviews avatar
--
-- THIS FILE adds only what is new for Admin Config / staff licences:
--   1) users.role includes staff
--   2) users.permissions JSON
--   3) admin_staff_licences table (if missing)
--   4) licence status ENUM includes banned + deleted (soft-delete + ban/unban)
--
-- How to import (phpMyAdmin):
--   1. Select production DB (e.g. yulowear1_123)
--   2. Import this file  OR  SQL tab → paste → Go
--   3. Run the VERIFY queries at the bottom
--
-- Does NOT drop/truncate data.
-- Does NOT reset master admin password (see optional block at end).
-- =============================================================================

SET @db := DATABASE();

-- ###########################################################################
-- 1) users.role → include staff
-- ###########################################################################
ALTER TABLE users
  MODIFY COLUMN role ENUM('customer', 'admin', 'super_admin', 'staff')
  NOT NULL DEFAULT 'customer';

-- ###########################################################################
-- 2) users.permissions (JSON feature keys for staff)
-- ###########################################################################
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'permissions'
    ),
    'SELECT ''users.permissions already exists'' AS info',
    'ALTER TABLE users ADD COLUMN permissions JSON NULL AFTER role'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ###########################################################################
-- 3) admin_staff_licences (create if missing — full current shape)
-- ###########################################################################
CREATE TABLE IF NOT EXISTS admin_staff_licences (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    staff_email VARCHAR(255) NOT NULL,
    staff_name VARCHAR(255) NULL,
    features JSON NOT NULL,
    status ENUM(
        'awaiting_dev_otp',
        'features_pending',
        'invite_sent',
        'pending_approval',
        'approved',
        'rejected',
        'cancelled',
        'banned',
        'deleted'
    ) NOT NULL DEFAULT 'awaiting_dev_otp',
    developer_otp_hash VARCHAR(255) NULL,
    developer_otp_expires DATETIME NULL,
    member_otp_hash VARCHAR(255) NULL,
    member_otp_expires DATETIME NULL,
    member_otp_verified_at DATETIME NULL,
    temp_password_hash VARCHAR(255) NULL,
    invite_token VARCHAR(64) NOT NULL,
    user_id INT UNSIGNED NULL,
    created_by INT UNSIGNED NULL,
    reviewed_by INT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_invite_token (invite_token),
    INDEX idx_staff_email (staff_email),
    INDEX idx_status (status),
    CONSTRAINT fk_staff_lic_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ###########################################################################
-- 4) Upgrade status ENUM on existing installs (banned + deleted)
--     Required even if table already existed from an older productionSync.
-- ###########################################################################
SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'admin_staff_licences'
    ),
    'ALTER TABLE admin_staff_licences
       MODIFY COLUMN status ENUM(
         ''awaiting_dev_otp'',
         ''features_pending'',
         ''invite_sent'',
         ''pending_approval'',
         ''approved'',
         ''rejected'',
         ''cancelled'',
         ''banned'',
         ''deleted''
       ) NOT NULL DEFAULT ''awaiting_dev_otp''',
    'SELECT ''admin_staff_licences missing — CREATE should have run'' AS info'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ###########################################################################
-- OPTIONAL — master admin User ID / password
-- Uncomment ONLY if production master login is still the old credentials.
-- ###########################################################################
-- UPDATE users
-- SET
--   email = '992201351702',
--   password = '$2y$12$MlhRPNX7eQ.NZiFE55/cYOU9E2BS5ChDeOromwdP5BQu/HLlyU2mm',
--   role = 'admin',
--   status = 'active',
--   email_verified_at = COALESCE(email_verified_at, NOW()),
--   updated_at = NOW()
-- WHERE id = (
--   SELECT id FROM (
--     SELECT id FROM users WHERE role IN ('admin', 'super_admin') ORDER BY id ASC LIMIT 1
--   ) AS t
-- );

-- =============================================================================
-- VERIFY (run after import)
-- =============================================================================
-- SHOW TABLES LIKE 'admin_staff_licences';
-- SHOW COLUMNS FROM users LIKE 'role';
-- SHOW COLUMNS FROM users LIKE 'permissions';
-- SHOW COLUMNS FROM admin_staff_licences LIKE 'status';
--
-- Expect status COLUMN_TYPE to include: banned, deleted
-- SELECT COLUMN_TYPE
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'admin_staff_licences'
--   AND COLUMN_NAME = 'status';
-- =============================================================================
