-- Flash Sale schedule columns on home_sections (safe to re-run).
-- Select database first, then Import / Run SQL.

-- Add columns only if missing (MySQL 8+ / MariaDB 10.3+)
SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_start_date'
    ),
    'SELECT ''sale_start_date already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_start_date DATE NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_end_date'
    ),
    'SELECT ''sale_end_date already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_end_date DATE NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_start_time'
    ),
    'SELECT ''sale_start_time already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_start_time TIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'sale_end_time'
    ),
    'SELECT ''sale_end_time already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN sale_end_time TIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'home_sections' AND COLUMN_NAME = 'is_locked'
    ),
    'SELECT ''is_locked already exists'' AS info',
    'ALTER TABLE home_sections ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE home_sections SET is_locked = 1 WHERE slug = 'flash-sale';
