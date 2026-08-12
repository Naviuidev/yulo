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

    private static function ensureColumn(PDO $db, string $table, string $column, string $definition): void
    {
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column'
        );
        $stmt->execute(['table' => $table, 'column' => $column]);
        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }

        $db->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
    }
}
