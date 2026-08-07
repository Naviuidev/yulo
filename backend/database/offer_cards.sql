-- Import in phpMyAdmin (select DB first) if upgrading an existing database.
-- Only ONE offer banner card is allowed (enforced in API).
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
