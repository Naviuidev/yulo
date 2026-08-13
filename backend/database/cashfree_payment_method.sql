-- Optional: run in phpMyAdmin if Pay Now fails with invalid payment_method.
ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM('phonepe', 'stripe', 'cod', 'upi', 'cashfree') NULL;
