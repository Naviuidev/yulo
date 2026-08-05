<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class CheckoutController extends BaseController
{
    public function summary(array $params = []): void
    {
        $userId = $this->authUserId();
        $cartModel = new Cart($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        $subtotal = 0;
        foreach ($items as $item) {
            $price = $item['variant_id']
                ? ($item['variant_sale_price'] ?? $item['variant_price'])
                : ($item['sale_price'] ?? $item['price']);
            $subtotal += (float) $price * (int) $item['quantity'];
        }

        $shipping = $subtotal >= 999 ? 0 : 49;
        $tax = round($subtotal * 0.18, 2);

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE user_id = :user_id ORDER BY is_default DESC');
        $addrStmt->execute(['user_id' => $userId]);

        Response::jsonSuccess([
            'items' => $items,
            'addresses' => $addrStmt->fetchAll(),
            'summary' => [
                'subtotal' => round($subtotal, 2),
                'shipping' => $shipping,
                'tax' => $tax,
                'total' => round($subtotal + $shipping + $tax, 2),
            ],
        ]);
    }

    /**
     * Guest checkout — creates a lightweight customer account (or reuses email)
     * and places the order from submitted cart items + address payload.
     */
    public function guest(array $params = []): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input)
            ->required('email')->email('email')
            ->required('name')
            ->required('phone')
            ->required('shipping_address')
            ->required('items');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        if (!is_array($input['items']) || count($input['items']) === 0) {
            Response::jsonError('Cart items are required.', 422);
        }

        $email = strtolower(trim($input['email']));
        $userModel = new User($this->db);
        $user = $userModel->findByEmail($email);

        if (!$user) {
            $tempPassword = bin2hex(random_bytes(8));
            $userId = $userModel->create([
                'name' => $input['name'],
                'email' => $email,
                'password' => Security::hashPassword($tempPassword),
                'phone' => $input['phone'],
                'role' => 'customer',
                'status' => 'active',
            ]);
        } else {
            $userId = (int) $user['id'];
        }

        $shippingAddress = $input['shipping_address'];
        if (!is_array($shippingAddress)) {
            Response::jsonError('Invalid shipping address.', 422);
        }

        $subtotal = 0;
        $lineItems = [];

        foreach ($input['items'] as $raw) {
            $productId = (int) ($raw['product_id'] ?? 0);
            $variantId = !empty($raw['variant_id']) ? (int) $raw['variant_id'] : null;
            $qty = max(1, (int) ($raw['quantity'] ?? 1));

            if ($variantId) {
                $stmt = $this->db->prepare(
                    'SELECT pv.price, pv.sale_price, pv.stock, p.id as product_id
                     FROM product_variants pv JOIN products p ON p.id = pv.product_id
                     WHERE pv.id = :id AND p.id = :product_id AND p.status = :status LIMIT 1'
                );
                $stmt->execute(['id' => $variantId, 'product_id' => $productId, 'status' => 'active']);
                $row = $stmt->fetch();
            } else {
                $stmt = $this->db->prepare(
                    'SELECT id as product_id, price, sale_price, stock FROM products WHERE id = :id AND status = :status LIMIT 1'
                );
                $stmt->execute(['id' => $productId, 'status' => 'active']);
                $row = $stmt->fetch();
            }

            if (!$row || (int) $row['stock'] < $qty) {
                Response::jsonError('One or more items are unavailable.', 422);
            }

            $price = (float) ($row['sale_price'] ?? $row['price']);
            $subtotal += $price * $qty;
            $lineItems[] = [
                'product_id' => $productId,
                'variant_id' => $variantId,
                'quantity' => $qty,
                'price' => $price,
            ];
        }

        $discount = 0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode($input['coupon_code']);
            if ($coupon && ($coupon['expires_at'] === null || strtotime($coupon['expires_at']) > time())) {
                if ((float) $coupon['min_order_amount'] <= $subtotal) {
                    $discount = $coupon['type'] === 'percentage'
                        ? $subtotal * ((float) $coupon['value'] / 100)
                        : (float) $coupon['value'];
                    $discount = min($discount, $subtotal);
                    $couponId = (int) $coupon['id'];
                }
            }
        }

        $shipping = $subtotal >= 999 ? 0 : 49;
        $tax = round(($subtotal - $discount) * 0.18, 2);
        $total = round($subtotal - $discount + $shipping + $tax, 2);
        $paymentMethod = in_array($input['payment_method'] ?? '', ['phonepe', 'stripe', 'cod', 'upi'], true)
            ? $input['payment_method']
            : 'cod';

        try {
            $this->db->beginTransaction();

            $orderModel = new Order($this->db);
            $orderNumber = $orderModel->generateOrderNumber();

            $stmt = $this->db->prepare(
                'INSERT INTO orders (user_id, order_number, status, subtotal, discount, shipping_charge, tax, total,
                                     coupon_id, payment_status, payment_method, shipping_address, billing_address, notes, created_at, updated_at)
                 VALUES (:user_id, :order_number, :status, :subtotal, :discount, :shipping, :tax, :total,
                         :coupon_id, :payment_status, :payment_method, :shipping_address, :billing_address, :notes, NOW(), NOW())'
            );
            $stmt->execute([
                'user_id' => $userId,
                'order_number' => $orderNumber,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping' => $shipping,
                'tax' => $tax,
                'total' => $total,
                'coupon_id' => $couponId,
                'payment_status' => 'pending',
                'payment_method' => $paymentMethod,
                'shipping_address' => json_encode($shippingAddress),
                'billing_address' => json_encode($input['billing_address'] ?? $shippingAddress),
                'notes' => $input['notes'] ?? 'Guest checkout',
            ]);

            $orderId = (int) $this->db->lastInsertId();
            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, NOW())'
            );

            foreach ($lineItems as $item) {
                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['price'] * $item['quantity'],
                ]);

                if ($item['variant_id']) {
                    $this->db->prepare('UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :qty')
                        ->execute(['qty' => $item['quantity'], 'id' => $item['variant_id']]);
                } else {
                    $this->db->prepare('UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty')
                        ->execute(['qty' => $item['quantity'], 'id' => $item['product_id']]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            $this->db->commit();

            Response::jsonSuccess([
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'total' => $total,
                'payment_method' => $paymentMethod,
            ], 'Guest order placed successfully.', 201);
        } catch (Throwable $e) {
            $this->db->rollBack();
            error_log('Guest checkout failed: ' . $e->getMessage());
            Response::jsonError('Failed to place guest order.', 500);
        }
    }
}
