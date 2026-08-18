<?php

declare(strict_types=1);

/**
 * Ensures upgrade tables exist on older production databases.
 */
final class SchemaGuard
{
    private static bool $homeSectionsReady = false;

    public static function ensureHomeSections(PDO $db): void
    {
        if (self::$homeSectionsReady) {
            return;
        }

        $db->exec(
            "CREATE TABLE IF NOT EXISTS home_sections (
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
            ) ENGINE=InnoDB"
        );

        $db->exec(
            "CREATE TABLE IF NOT EXISTS product_home_sections (
                product_id INT UNSIGNED NOT NULL,
                section_id INT UNSIGNED NOT NULL,
                PRIMARY KEY (product_id, section_id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (section_id) REFERENCES home_sections(id) ON DELETE CASCADE
            ) ENGINE=InnoDB"
        );

        // Older DBs may have home_sections without Flash Sale schedule columns.
        self::ensureColumn($db, 'home_sections', 'sale_start_date', 'DATE NULL');
        self::ensureColumn($db, 'home_sections', 'sale_end_date', 'DATE NULL');
        self::ensureColumn($db, 'home_sections', 'sale_start_time', 'TIME NULL');
        self::ensureColumn($db, 'home_sections', 'sale_end_time', 'TIME NULL');
        self::ensureColumn($db, 'home_sections', 'is_locked', 'TINYINT(1) NOT NULL DEFAULT 0');

        $count = (int) $db->query('SELECT COUNT(*) FROM home_sections')->fetchColumn();
        if ($count === 0) {
            $db->exec(
                "INSERT INTO home_sections (name, slug, description, sort_order, status, is_locked, created_at, updated_at) VALUES
                ('New Arrivals', 'new-arrivals', 'Newest products on the homepage', 1, 'active', 0, NOW(), NOW()),
                ('Trending Now', 'trending', 'Trending products slider', 2, 'active', 0, NOW(), NOW()),
                ('Best Sellers', 'best-sellers', 'Best selling products', 3, 'active', 0, NOW(), NOW()),
                ('Flash Sale', 'flash-sale', 'Flash sale products', 4, 'active', 1, NOW(), NOW())"
            );
        } else {
            $db->exec("UPDATE home_sections SET is_locked = 1 WHERE slug = 'flash-sale'");
        }

        self::$homeSectionsReady = true;
    }

    /** Ensure orders.payment_method accepts online gateways used by YULO. */
    public static function ensureCashfreePaymentMethod(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        try {
            $db->exec(
                "ALTER TABLE orders
                 MODIFY COLUMN payment_method ENUM('phonepe', 'stripe', 'cod', 'upi', 'cashfree', 'paytm', 'razorpay', 'payu') NULL"
            );
        } catch (Throwable) {
            // Ignore if already applied / no permission — create will surface a clear error.
        }

        $ready = true;
    }

    /** Track whether paid-order emails (invoice + owner notify) were sent. */
    public static function ensureOrderEmailNotifiedAt(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        self::ensureColumn($db, 'orders', 'email_notified_at', 'DATETIME NULL');
        $ready = true;
    }

    /** Stamp when order was marked delivered (for return window). */
    public static function ensureOrderDeliveredAt(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        self::ensureColumn($db, 'orders', 'delivered_at', 'DATETIME NULL');
        // Best-effort backfill so existing delivered orders get a return window anchor.
        try {
            $db->exec(
                "UPDATE orders SET delivered_at = updated_at
                 WHERE status = 'delivered' AND delivered_at IS NULL AND updated_at IS NOT NULL"
            );
        } catch (Throwable $e) {
            // ignore
        }
        $ready = true;
    }

    /** Per-product GST toggle (admin product form). */
    public static function ensureProductGstApplicable(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        self::ensureColumn(
            $db,
            'products',
            'gst_applicable',
            'TINYINT(1) NOT NULL DEFAULT 1'
        );
        $ready = true;
    }

    /** Shipping / color / size options on products (admin product form). */
    public static function ensureProductCommerceOptions(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        self::ensureProductGstApplicable($db);
        self::ensureColumn($db, 'products', 'custom_shipping', 'TINYINT(1) NOT NULL DEFAULT 0');
        self::ensureColumn($db, 'products', 'shipping_price', 'DECIMAL(12, 2) NULL');
        self::ensureColumn($db, 'products', 'has_color_variants', 'TINYINT(1) NOT NULL DEFAULT 0');
        self::ensureColumn($db, 'products', 'colors', 'JSON NULL');
        self::ensureColumn($db, 'products', 'size_option', "VARCHAR(10) NOT NULL DEFAULT 'none'");
        self::ensureColumn($db, 'products', 'sizes', 'JSON NULL');
        self::ensureColumn($db, 'products', 'cod_available', 'TINYINT(1) NOT NULL DEFAULT 1');
        self::ensureColumn($db, 'products', 'cancel_available', 'TINYINT(1) NOT NULL DEFAULT 1');
        self::ensureColumn($db, 'products', 'return_available', 'TINYINT(1) NOT NULL DEFAULT 1');
        $ready = true;
    }

    /** Customer return requests linked to orders. */
    public static function ensureOrderReturns(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $db->exec(
            "CREATE TABLE IF NOT EXISTS order_returns (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $ready = true;
    }

    /** Customer ↔ admin help messages on an order (returns / support). */
    public static function ensureOrderHelpMessages(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $db->exec(
            "CREATE TABLE IF NOT EXISTS order_help_messages (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                order_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                sender ENUM('customer', 'admin') NOT NULL,
                message TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                INDEX idx_order_help_order (order_id),
                INDEX idx_order_help_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $ready = true;
    }

    /** Persist selected color/size on cart lines and order lines. */
    public static function ensureCartOrderItemOptions(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        self::ensureColumn($db, 'cart_items', 'color', 'VARCHAR(100) NULL');
        self::ensureColumn($db, 'cart_items', 'size', 'VARCHAR(20) NULL');
        self::ensureColumn($db, 'order_items', 'color', 'VARCHAR(100) NULL');
        self::ensureColumn($db, 'order_items', 'size', 'VARCHAR(20) NULL');
        $ready = true;
    }

    /** Customer tracking follow-up queries for admin Followups. */
    public static function ensureTrackingFollowups(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $db->exec(
            "CREATE TABLE IF NOT EXISTS tracking_followups (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $ready = true;
    }

    /** Storefront page-view tracking for admin Visitors analytics. */
    public static function ensureVisitorPageViews(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $db->exec(
            "CREATE TABLE IF NOT EXISTS visitor_page_views (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $ready = true;
    }

    /** Per-admin read state for activity-feed notification keys. */
    public static function ensureAdminNotificationReads(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $db->exec(
            "CREATE TABLE IF NOT EXISTS admin_notification_reads (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                item_key VARCHAR(120) NOT NULL,
                read_at DATETIME NOT NULL,
                UNIQUE KEY uk_admin_notif_read (user_id, item_key),
                INDEX idx_admin_notif_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $ready = true;
    }

    /** users.marketing_opt_in — default opted-in for promotions. */
    public static function ensureMarketingOptIn(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        self::ensureColumn(
            $db,
            'users',
            'marketing_opt_in',
            'TINYINT(1) NOT NULL DEFAULT 1'
        );

        $ready = true;
    }

    /** Log of triggered digital marketing promotion campaigns. */
    public static function ensureMarketingCampaigns(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        $db->exec(
            "CREATE TABLE IF NOT EXISTS marketing_campaigns (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );

        $ready = true;
    }

    /** Review display name + optional avatar for testimonials / moderation. */
    public static function ensureReviewExtras(PDO $db): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }

        self::ensureColumn($db, 'reviews', 'display_name', 'VARCHAR(255) NULL');
        self::ensureColumn($db, 'reviews', 'avatar_path', 'VARCHAR(500) NULL');
        $ready = true;
    }

    private static function ensureColumn(PDO $db, string $table, string $column, string $definition): void
    {
        $schema = (string) ($_ENV['DB_NAME'] ?? '');
        if ($schema === '') {
            $schema = (string) $db->query('SELECT DATABASE()')->fetchColumn();
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );
        $stmt->execute(['schema' => $schema, 'table' => $table, 'column' => $column]);
        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }

        $db->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
    }
}
