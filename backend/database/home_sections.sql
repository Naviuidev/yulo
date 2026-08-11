-- Import in phpMyAdmin (select DB first) if upgrading an existing database.
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

INSERT INTO home_sections (name, slug, description, sort_order, status, is_locked, created_at, updated_at)
SELECT * FROM (
    SELECT 'New Arrivals' AS name, 'new-arrivals' AS slug, 'Newest products on the homepage' AS description, 1 AS sort_order, 'active' AS status, 0 AS is_locked, NOW() AS created_at, NOW() AS updated_at
    UNION ALL SELECT 'Trending Now', 'trending', 'Trending products slider', 2, 'active', 0, NOW(), NOW()
    UNION ALL SELECT 'Best Sellers', 'best-sellers', 'Best selling products', 3, 'active', 0, NOW(), NOW()
    UNION ALL SELECT 'Flash Sale', 'flash-sale', 'Flash sale products', 4, 'active', 1, NOW(), NOW()
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM home_sections LIMIT 1);

UPDATE home_sections SET is_locked = 1 WHERE slug = 'flash-sale';
