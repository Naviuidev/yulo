-- Product-level Cash on Delivery (COD) flag for production.
-- Safe to re-run.
--
-- cod_available = 1 → product can be paid with COD (when ALL cart items allow COD)
-- cod_available = 0 → online payment only for carts containing this product

SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'cod_available'
    ),
    'SELECT ''products.cod_available already exists'' AS info',
    'ALTER TABLE products ADD COLUMN cod_available TINYINT(1) NOT NULL DEFAULT 1 AFTER shipping_price'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'product_cod_available.sql applied' AS info;
