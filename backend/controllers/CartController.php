<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class CartController extends BaseController
{
    private Cart $cartModel;

    public function __construct()
    {
        parent::__construct();
        $this->cartModel = new Cart($this->db);
    }

    public function index(array $params = []): void
    {
        $userId = $this->authUserId();
        $cartId = $this->cartModel->getOrCreate($userId);
        $items = $this->cartModel->getItems($cartId);

        $subtotal = 0;
        foreach ($items as &$item) {
            $regular = !empty($item['variant_id'])
                ? (float) ($item['variant_price'] ?? $item['price'] ?? 0)
                : (float) ($item['price'] ?? 0);
            $payable = Pricing::unitPriceFromItem($item);
            $item['regular_price'] = $regular;
            $item['unit_price'] = $payable;
            // Payable unit amount for storefront (must be sale price when set).
            $item['price'] = $payable;
            $item['gst_applicable'] = Pricing::isGstApplicable($item) ? 1 : 0;
            $item['line_total'] = $payable * (int) $item['quantity'];
            $subtotal += $item['line_total'];
        }
        unset($item);

        $tax = Pricing::gstTaxFromItems($items, 0.0);

        Response::jsonSuccess([
            'cart_id' => $cartId,
            'items' => $items,
            'summary' => [
                'item_count' => count($items),
                'subtotal' => round($subtotal, 2),
                'tax' => $tax,
            ],
        ]);
    }

    public function add(array $params = []): void
    {
        $input = $this->getJsonInput();
        $validator = Validator::make($input)->required('product_id')->integer('product_id')->required('quantity')->integer('quantity');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $userId = $this->authUserId();
        $cartId = $this->cartModel->getOrCreate($userId);

        $stmt = $this->db->prepare('SELECT id, stock, price, sale_price FROM products WHERE id = :id AND status = :status LIMIT 1');
        $stmt->execute(['id' => $input['product_id'], 'status' => 'active']);
        $product = $stmt->fetch();

        if (!$product) {
            Response::jsonError('Product not found.', 404);
        }

        $variantId = !empty($input['variant_id']) ? (int) $input['variant_id'] : null;
        $color = $this->normalizeOption($input['color'] ?? null, 100);
        $size = $this->normalizeOption($input['size'] ?? null, 20);
        $price = Pricing::effective(
            isset($product['sale_price']) ? (float) $product['sale_price'] : null,
            (float) $product['price']
        );

        if ($variantId) {
            $vStmt = $this->db->prepare('SELECT id, stock, price, sale_price FROM product_variants WHERE id = :id AND product_id = :product_id LIMIT 1');
            $vStmt->execute(['id' => $variantId, 'product_id' => $input['product_id']]);
            $variant = $vStmt->fetch();
            if (!$variant) {
                Response::jsonError('Variant not found.', 404);
            }
            $price = Pricing::effective(
                isset($variant['sale_price']) ? (float) $variant['sale_price'] : null,
                (float) $variant['price']
            );
        }

        SchemaGuard::ensureCartOrderItemOptions($this->db);

        $checkStmt = $this->db->prepare(
            'SELECT id, quantity FROM cart_items
             WHERE cart_id = :cart_id AND product_id = :product_id AND (variant_id <=> :variant_id)
               AND COALESCE(color, \'\') = :color AND COALESCE(size, \'\') = :size
             LIMIT 1'
        );
        $checkStmt->execute([
            'cart_id' => $cartId,
            'product_id' => $input['product_id'],
            'variant_id' => $variantId,
            'color' => $color ?? '',
            'size' => $size ?? '',
        ]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            $newQty = (int) $existing['quantity'] + (int) $input['quantity'];
            $stmt = $this->db->prepare(
                'UPDATE cart_items SET quantity = :quantity, price = :price, color = :color, size = :size, updated_at = NOW() WHERE id = :id'
            );
            $stmt->execute([
                'quantity' => $newQty,
                'price' => $price,
                'color' => $color,
                'size' => $size,
                'id' => $existing['id'],
            ]);
        } else {
            $stmt = $this->db->prepare(
                'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price, color, size, created_at, updated_at)
                 VALUES (:cart_id, :product_id, :variant_id, :quantity, :price, :color, :size, NOW(), NOW())'
            );
            $stmt->execute([
                'cart_id' => $cartId,
                'product_id' => $input['product_id'],
                'variant_id' => $variantId,
                'quantity' => $input['quantity'],
                'price' => $price,
                'color' => $color,
                'size' => $size,
            ]);
        }

        $this->index();
    }

    private function normalizeOption(mixed $value, int $maxLen): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return null;
        }
        return mb_substr($trimmed, 0, $maxLen);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        $cartId = $this->cartModel->getOrCreate($userId);

        $stmt = $this->db->prepare(
            'UPDATE cart_items SET quantity = :quantity, updated_at = NOW()
             WHERE id = :id AND cart_id = :cart_id'
        );
        $stmt->execute(['quantity' => $input['quantity'] ?? 1, 'id' => $params['id'], 'cart_id' => $cartId]);

        if ($stmt->rowCount() === 0) {
            Response::jsonError('Cart item not found.', 404);
        }

        $this->index();
    }

    public function remove(array $params): void
    {
        $userId = $this->authUserId();
        $cartId = $this->cartModel->getOrCreate($userId);

        $stmt = $this->db->prepare('DELETE FROM cart_items WHERE id = :id AND cart_id = :cart_id');
        $stmt->execute(['id' => $params['id'], 'cart_id' => $cartId]);

        if ($stmt->rowCount() === 0) {
            Response::jsonError('Cart item not found.', 404);
        }

        Response::jsonSuccess(null, 'Item removed from cart.');
    }

    public function clear(array $params = []): void
    {
        $userId = $this->authUserId();
        $cartId = $this->cartModel->getOrCreate($userId);
        $this->cartModel->clear($cartId);
        Response::jsonSuccess(null, 'Cart cleared.');
    }
}
