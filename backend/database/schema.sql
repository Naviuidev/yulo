-- YULO eCommerce Database Schema
-- Shared hosting (MilesWeb / cPanel):
--   1. Create DB in cPanel first (e.g. yulowear1_123)
--   2. Select that DB in phpMyAdmin
--   3. Import this file (do NOT create yulo_db here — hosts block CREATE DATABASE)
-- Local MySQL:
--   CREATE DATABASE yulo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   then: mysql -u root -p yulo_db < schema.sql

-- Users
CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    role ENUM('customer', 'admin', 'super_admin', 'staff') DEFAULT 'customer',
    permissions JSON NULL,
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    marketing_opt_in TINYINT(1) NOT NULL DEFAULT 1,
    email_verified_at DATETIME NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expires DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB;

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_token (token)
) ENGINE=InnoDB;

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    parent_id INT UNSIGNED NULL,
    description TEXT NULL,
    image VARCHAR(500) NULL,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Brands
CREATE TABLE IF NOT EXISTS brands (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    logo VARCHAR(500) NULL,
    description TEXT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Products
CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    short_description VARCHAR(500) NULL,
    sku VARCHAR(100) NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(12, 2) NULL,
    gst_applicable TINYINT(1) NOT NULL DEFAULT 1,
    custom_shipping TINYINT(1) NOT NULL DEFAULT 0,
    shipping_price DECIMAL(12, 2) NULL,
    has_color_variants TINYINT(1) NOT NULL DEFAULT 0,
    colors JSON NULL,
    size_option VARCHAR(10) NOT NULL DEFAULT 'none',
    sizes JSON NULL,
    stock INT DEFAULT 0,
    category_id INT UNSIGNED NULL,
    brand_id INT UNSIGNED NULL,
    status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
    is_featured TINYINT(1) DEFAULT 0,
    is_new TINYINT(1) DEFAULT 0,
    is_trending TINYINT(1) DEFAULT 0,
    is_bestseller TINYINT(1) DEFAULT 0,
    video_url VARCHAR(500) NULL,
    barcode VARCHAR(100) NULL,
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    low_stock_threshold INT DEFAULT 5,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    INDEX idx_products_status (status),
    INDEX idx_products_category (category_id),
    INDEX idx_products_brand (brand_id),
    INDEX idx_products_featured (is_featured),
    INDEX idx_products_new (is_new),
    INDEX idx_products_trending (is_trending),
    INDEX idx_products_bestseller (is_bestseller)
) ENGINE=InnoDB;

-- Product images
CREATE TABLE IF NOT EXISTS product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Homepage product sections (New Arrivals, Trending, etc.)
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS product_home_sections (
    product_id INT UNSIGNED NOT NULL,
    section_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, section_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES home_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Product variants
CREATE TABLE IF NOT EXISTS product_variants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NULL,
    price DECIMAL(12, 2) NOT NULL,
    sale_price DECIMAL(12, 2) NULL,
    stock INT DEFAULT 0,
    attributes JSON NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Carts
CREATE TABLE IF NOT EXISTS carts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_id VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cart_user (user_id)
) ENGINE=InnoDB;

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(12, 2) NOT NULL,
    color VARCHAR(100) NULL,
    size VARCHAR(20) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_wishlist (user_id, product_id)
) ENGINE=InnoDB;

-- Compare lists
CREATE TABLE IF NOT EXISTS compare_lists (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_compare (user_id, product_id)
) ENGINE=InnoDB;

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('percentage', 'fixed') DEFAULT 'percentage',
    value DECIMAL(12, 2) NOT NULL,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount DECIMAL(12, 2) NULL,
    max_uses INT NULL,
    used_count INT DEFAULT 0,
    expires_at DATETIME NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(500) NOT NULL,
    address_line2 VARCHAR(500) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    type ENUM('shipping', 'billing', 'both') DEFAULT 'shipping',
    is_default TINYINT(1) DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded') DEFAULT 'pending',
    subtotal DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    shipping_charge DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    coupon_id INT UNSIGNED NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method ENUM('phonepe', 'stripe', 'cod', 'upi', 'cashfree') NULL,
    shipping_address JSON NULL,
    billing_address JSON NULL,
    notes TEXT NULL,
    email_notified_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL,
    INDEX idx_orders_status (status),
    INDEX idx_orders_user (user_id)
) ENGINE=InnoDB;

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    color VARCHAR(100) NULL,
    size VARCHAR(20) NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    gateway_transaction_id VARCHAR(255) NULL,
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('initiated', 'completed', 'failed', 'refunded') DEFAULT 'initiated',
    metadata JSON NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    rating TINYINT NOT NULL,
    title VARCHAR(255) NULL,
    comment TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Blogs
CREATE TABLE IF NOT EXISTS blogs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content LONGTEXT NOT NULL,
    excerpt TEXT NULL,
    image VARCHAR(500) NULL,
    author_id INT UNSIGNED NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    published_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Banners
CREATE TABLE IF NOT EXISTS banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NULL,
    image VARCHAR(500) NOT NULL,
    link VARCHAR(500) NULL,
    position VARCHAR(50) DEFAULT 'home',
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Offer strips (top bar above navbar)
CREATE TABLE IF NOT EXISTS offer_strips (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(500) NOT NULL,
    is_scrolling TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Featured collection tiles on homepage (max 3: 1 main + 2 side)
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
) ENGINE=InnoDB;

-- Offer card (single homepage popup banner)
CREATE TABLE IF NOT EXISTS offer_cards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NULL,
    image VARCHAR(500) NOT NULL,
    link VARCHAR(500) NULL,
    show_popup TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NULL,
    `group` VARCHAR(50) DEFAULT 'general',
    is_public TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    balance DECIMAL(12, 2) DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wallet_id INT UNSIGNED NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Rewards
CREATE TABLE IF NOT EXISTS rewards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    points INT NOT NULL,
    type ENUM('earned', 'redeemed', 'expired') DEFAULT 'earned',
    description VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Recently viewed
CREATE TABLE IF NOT EXISTS recently_viewed (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    viewed_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_recently_viewed (user_id, product_id)
) ENGINE=InnoDB;

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('active', 'unsubscribed') DEFAULT 'active',
    subscribed_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Digital marketing campaign send log
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

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied') DEFAULT 'new',
    created_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- CMS pages
CREATE TABLE IF NOT EXISTS cms_pages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content LONGTEXT NOT NULL,
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    status ENUM('draft', 'published') DEFAULT 'draft',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Delivery partners
CREATE TABLE IF NOT EXISTS delivery_partners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    contact_email VARCHAR(255) NULL,
    contact_phone VARCHAR(20) NULL,
    tracking_url VARCHAR(500) NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    partner_id INT UNSIGNED NULL,
    carrier VARCHAR(100) NULL,
    tracking_number VARCHAR(255) NULL,
    otp VARCHAR(10) NULL,
    status ENUM('pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed') DEFAULT 'pending',
    estimated_delivery DATE NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (partner_id) REFERENCES delivery_partners(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Customer tracking follow-up queries (admin Followups)
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

-- Storefront visitor page views (admin Visitors analytics)
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

-- Rate limits
CREATE TABLE IF NOT EXISTS rate_limits (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    hits INT NOT NULL DEFAULT 0,
    window_start DATETIME NOT NULL,
    INDEX idx_rate_limits_lookup (ip_address, endpoint, window_start)
) ENGINE=InnoDB;

-- Inventory logs
CREATE TABLE IF NOT EXISTS inventory_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity INT NOT NULL,
    type ENUM('adjustment', 'sale', 'return', 'restock') DEFAULT 'adjustment',
    notes TEXT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Staff licences (role-based admin access invites)
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Default admin user: 992201351702 / Hosur@1998
INSERT INTO users (name, email, password, role, status, email_verified_at, created_at, updated_at)
VALUES (
    'YULO Admin',
    '992201351702',
    '$2y$12$MlhRPNX7eQ.NZiFE55/cYOU9E2BS5ChDeOromwdP5BQu/HLlyU2mm',
    'admin',
    'active',
    NOW(),
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE email = email;

-- Sample settings
INSERT INTO settings (`key`, value, `group`, is_public) VALUES
('site_name', 'YULO', 'general', 1),
('site_tagline', 'Your Ultimate Lifestyle Online', 'general', 1),
('support_email', 'support@yulo.com', 'general', 1),
('support_phone', '+91 9876543210', 'general', 1)
ON DUPLICATE KEY UPDATE value = VALUES(value);
