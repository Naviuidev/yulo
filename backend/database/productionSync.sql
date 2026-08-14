-- =============================================================================
-- YULO productionSync.sql  (full additive upgrade — safe to re-run)
-- =============================================================================
-- Run in phpMyAdmin on production:
--   1. Select the production database on the left
--   2. Import this file  OR  SQL tab → paste → Go
--
-- Covers feature tables / columns added after the original schema:
--   • home_sections + product_home_sections (+ flash sale schedule cols)
--   • offer_strips, featured_collections, offer_cards
--   • tracking_followups, visitor_page_views, admin_notification_reads
--   • admin_staff_licences + users.staff role + users.permissions
--   • product / cart / order commerce columns
--   • orders.payment_method cashfree + email_notified_at
--   • reviews.display_name / avatar_path
--   • favicon settings keys
--
-- Does NOT drop data. Does NOT truncate tables.
-- =============================================================================

SET @db := DATABASE();

-- ###########################################################################
-- A) NEW TABLES
-- ###########################################################################

-- ---------------------------------------------------------------------------
-- A1) Homepage sections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS home_sections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    sale_start_date DATE NULL,
    sale_end_date DATE NULL,
    sale_start_time TIME NULL,
    sale_end_time TIME NULL,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_home_sections (
    product_id INT UNSIGNED NOT NULL,
    section_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, section_id),
    CONSTRAINT fk_phs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_phs_section FOREIGN KEY (section_id) REFERENCES home_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO home_sections (name, slug, description, sort_order, status, is_locked, created_at, updated_at)
SELECT * FROM (
    SELECT 'New Arrivals' AS name, 'new-arrivals' AS slug, 'Newest products on the homepage' AS description, 1 AS sort_order, 'active' AS status, 0 AS is_locked, NOW() AS created_at, NOW() AS updated_at
    UNION ALL SELECT 'Trending Now', 'trending', 'Trending products slider', 2, 'active', 0, NOW(), NOW()
    UNION ALL SELECT 'Best Sellers', 'best-sellers', 'Best selling products', 3, 'active', 0, NOW(), NOW()
    UNION ALL SELECT 'Flash Sale', 'flash-sale', 'Flash sale products', 4, 'active', 1, NOW(), NOW()
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM home_sections LIMIT 1);

UPDATE home_sections SET is_locked = 1 WHERE slug = 'flash-sale';

-- ---------------------------------------------------------------------------
-- A2) Offer strips (top announcement bar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_strips (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(500) NOT NULL,
    is_scrolling TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- A3) Featured collections (homepage tiles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS featured_collections (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image VARCHAR(500) NOT NULL,
    link VARCHAR(500) NULL,
    cta_text VARCHAR(100) NULL,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- A4) Offer cards (popup / banner card — one active)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_cards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NULL,
    image VARCHAR(500) NOT NULL,
    link VARCHAR(500) NULL,
    show_popup TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- A5) Tracking followups (customer Raise query → admin Followups)
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
-- A6) Visitor analytics
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

-- ---------------------------------------------------------------------------
-- A7) Admin notification read state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_notification_reads (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    item_key VARCHAR(120) NOT NULL,
    read_at DATETIME NOT NULL,
    UNIQUE KEY uk_admin_notif_read (user_id, item_key),
    INDEX idx_admin_notif_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- A8) Staff licences (Admin Config)
-- ---------------------------------------------------------------------------
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
        'cancelled'
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
-- B) COLUMN UPGRADES (safe if already present)
-- ###########################################################################

-- B1) users.role includes staff
ALTER TABLE users
  MODIFY COLUMN role ENUM('customer', 'admin', 'super_admin', 'staff')
  NOT NULL DEFAULT 'customer';

-- B2) users.permissions
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='permissions'),
    'SELECT ''users.permissions already exists'' AS info',
    'ALTER TABLE users ADD COLUMN permissions JSON NULL AFTER role'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B3) orders.payment_method accepts cashfree
ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM('phonepe', 'stripe', 'cod', 'upi', 'cashfree') NULL;

-- B4) orders.email_notified_at
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='email_notified_at'),
    'SELECT ''orders.email_notified_at already exists'' AS info',
    'ALTER TABLE orders ADD COLUMN email_notified_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B5) home_sections flash-sale schedule (older installs may lack cols)
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='home_sections' AND COLUMN_NAME='sale_start_date'),
    'SELECT ''sale_start_date already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_start_date DATE NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='home_sections' AND COLUMN_NAME='sale_end_date'),
    'SELECT ''sale_end_date already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_end_date DATE NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='home_sections' AND COLUMN_NAME='sale_start_time'),
    'SELECT ''sale_start_time already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_start_time TIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='home_sections' AND COLUMN_NAME='sale_end_time'),
    'SELECT ''sale_end_time already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_end_time TIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='home_sections' AND COLUMN_NAME='is_locked'),
    'SELECT ''is_locked already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- B6) products commerce columns
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='products' AND COLUMN_NAME='gst_applicable'),
    'SELECT ''gst_applicable already exists'' AS info',
    'ALTER TABLE products ADD COLUMN gst_applicable TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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

-- B7) cart_items / order_items color + size
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

-- B8) reviews display name + avatar
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='reviews' AND COLUMN_NAME='display_name'),
    'SELECT ''reviews.display_name already exists'' AS info',
    'ALTER TABLE reviews ADD COLUMN display_name VARCHAR(255) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='reviews' AND COLUMN_NAME='avatar_path'),
    'SELECT ''reviews.avatar_path already exists'' AS info',
    'ALTER TABLE reviews ADD COLUMN avatar_path VARCHAR(500) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ###########################################################################
-- C) SETTINGS KEYS (favicon)
-- ###########################################################################
INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
VALUES
  ('favicon_url', '', 'branding', 0, NOW()),
  ('favicon_published', '', 'branding', 1, NOW())
ON DUPLICATE KEY UPDATE
  `group` = VALUES(`group`),
  updated_at = NOW();

UPDATE settings SET is_public = 0, `group` = 'branding' WHERE `key` = 'favicon_url';
UPDATE settings SET is_public = 1, `group` = 'branding' WHERE `key` = 'favicon_published';

-- ###########################################################################
-- OPTIONAL: master admin → 992201351702 / Hosur@1998  (uncomment if needed)
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
-- Verify after import:
--   SHOW TABLES LIKE 'home_sections';
--   SHOW TABLES LIKE 'offer_strips';
--   SHOW TABLES LIKE 'featured_collections';
--   SHOW TABLES LIKE 'offer_cards';
--   SHOW TABLES LIKE 'tracking_followups';
--   SHOW TABLES LIKE 'visitor_page_views';
--   SHOW TABLES LIKE 'admin_notification_reads';
--   SHOW TABLES LIKE 'admin_staff_licences';
--   SHOW COLUMNS FROM users LIKE 'permissions';
--   SHOW COLUMNS FROM products LIKE 'gst_applicable';
--   SELECT `key`, `group`, is_public FROM settings
--     WHERE `key` IN ('favicon_url','favicon_published');
-- =============================================================================
