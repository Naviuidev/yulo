-- Import in phpMyAdmin (select DB first) if upgrading an existing database.
CREATE TABLE IF NOT EXISTS offer_strips (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(500) NOT NULL,
    is_scrolling TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Seed only when table is empty
INSERT INTO offer_strips (text, is_scrolling, sort_order, status, created_at, updated_at)
SELECT
    'Free shipping on orders above ₹999 · Premium eyewear collection now live',
    0,
    1,
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM offer_strips LIMIT 1);
