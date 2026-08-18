-- Product-level customer cancel flag for production.
-- Safe to re-run.
--
-- cancel_available = 1 → customer may cancel orders containing this product
--                       (only if EVERY item in the order allows cancel)
-- cancel_available = 0 → customer cannot cancel orders that include this product
--
-- Cancelling an order restores stock for all line items.

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'cancel_available'
    ),
    'SELECT ''products.cancel_available already exists'' AS info',
    'ALTER TABLE products ADD COLUMN cancel_available TINYINT(1) NOT NULL DEFAULT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'product_cancel_available.sql applied' AS info;
