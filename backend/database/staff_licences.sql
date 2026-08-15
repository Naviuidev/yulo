-- Staff licence / role-based admin access
-- Run once on existing DBs (also applied via schema sync)

ALTER TABLE users
  MODIFY COLUMN role ENUM('customer', 'admin', 'super_admin', 'staff') NOT NULL DEFAULT 'customer';

-- permissions: JSON array of feature keys; NULL = full access (master)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS permissions JSON NULL AFTER role;

CREATE TABLE IF NOT EXISTS admin_staff_licences (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  staff_email VARCHAR(255) NOT NULL,
  staff_name VARCHAR(255) NULL,
  features JSON NOT NULL,
  status ENUM(
    'awaiting_dev_otp',
    'features_pending',
    'invite_sent',
    'pending_approval',
    'approved',
    'rejected',
    'cancelled',
    'banned',
    'deleted'
  ) NOT NULL DEFAULT 'awaiting_dev_otp',
  developer_otp_hash VARCHAR(255) NULL,
  developer_otp_expires DATETIME NULL,
  member_otp_hash VARCHAR(255) NULL,
  member_otp_expires DATETIME NULL,
  member_otp_verified_at DATETIME NULL,
  temp_password_hash VARCHAR(255) NULL,
  invite_token VARCHAR(64) NOT NULL,
  user_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_invite_token (invite_token),
  INDEX idx_staff_email (staff_email),
  INDEX idx_status (status),
  CONSTRAINT fk_staff_lic_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
