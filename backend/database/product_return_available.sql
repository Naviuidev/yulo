-- Product-level customer return flag for production.
-- Safe to re-run.
--
-- return_available = 1 → customer may request a return for orders containing this product
--                       (only if EVERY item in the order allows return, and order is delivered)
-- return_available = 0 → customer cannot return orders that include this product

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'return_available'
    ),
    'SELECT ''products.return_available already exists'' AS info',
    'ALTER TABLE products ADD COLUMN return_available TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Customer return requests (in-process tracking for admin).
CREATE TABLE IF NOT EXISTS order_returns (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'product_return_available.sql applied' AS info;
