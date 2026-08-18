-- Optional: run in phpMyAdmin if Pay Now fails with invalid payment_method.
-- Prefer the full deploy script: production_payments_gateways.sql
ALTER TABLE orders
  MODIFY COLUMN payment_method ENUM('phonepe', 'stripe', 'cod', 'upi', 'cashfree', 'paytm', 'razorpay', 'payu') NULL;
