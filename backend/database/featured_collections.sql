-- Import in phpMyAdmin (select DB first) if upgrading an existing database.
-- Max 3 items for homepage Featured Collection (1 large + 2 side).
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
