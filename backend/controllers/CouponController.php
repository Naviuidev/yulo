<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class CouponController extends BaseController
{
    private Coupon $couponModel;

    public function __construct()
    {
        parent::__construct();
        $this->couponModel = new Coupon($this->db);
    }

    public function validate(array $params = []): void
    {
        $input = $this->getJsonInput();

        if (empty($input['code'])) {
            Response::jsonError('Coupon code is required.', 422);
        }

        $subtotal = (float) ($input['subtotal'] ?? 0);
        $coupon = $this->couponModel->findByCode($input['code']);

        if (!$coupon) {
            Response::jsonError('Invalid coupon code.', 404);
        }

        if ($coupon['expires_at'] && strtotime($coupon['expires_at']) < time()) {
            Response::jsonError('Coupon has expired.', 422);
        }

        if ($coupon['max_uses'] !== null && (int) $coupon['used_count'] >= (int) $coupon['max_uses']) {
            Response::jsonError('Coupon usage limit reached.', 422);
        }

        if ($subtotal < (float) $coupon['min_order_amount']) {
            Response::jsonError('Minimum order amount not met.', 422);
        }

        $discount = $coupon['type'] === 'percentage'
            ? round($subtotal * ($coupon['value'] / 100), 2)
            : (float) $coupon['value'];

        if ($coupon['max_discount'] !== null) {
            $discount = min($discount, (float) $coupon['max_discount']);
        }

        Response::jsonSuccess([
            'code' => $coupon['code'],
            'type' => $coupon['type'],
            'value' => $coupon['value'],
            'discount' => min($discount, $subtotal),
        ], 'Coupon is valid.');
    }
}
