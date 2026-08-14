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
        $code = trim((string) ($input['code'] ?? ''));

        if ($code === '') {
            Response::jsonError('Coupon code is required.', 422);
        }

        $subtotal = (float) ($input['subtotal'] ?? 0);
        $coupon = $this->couponModel->findByCode($code);

        if (!$coupon) {
            Response::jsonError('Invalid coupon code.', 404);
        }

        if ($this->couponModel->isExpired($coupon)) {
            Response::jsonError('Coupon has expired.', 422);
        }

        if ($coupon['max_uses'] !== null && (int) $coupon['used_count'] >= (int) $coupon['max_uses']) {
            Response::jsonError('Coupon usage limit reached.', 422);
        }

        $minOrder = (float) ($coupon['min_order_amount'] ?? 0);
        if ($subtotal < $minOrder) {
            Response::jsonError(
                'Minimum order amount of ₹' . number_format($minOrder, 2) . ' required for this coupon.',
                422
            );
        }

        $discount = $this->couponModel->calculateDiscount($coupon, $subtotal);
        if ($discount <= 0) {
            Response::jsonError('Coupon does not apply to this order.', 422);
        }

        $type = (string) $coupon['type'];
        $value = (float) $coupon['value'];

        Response::jsonSuccess([
            'code' => $coupon['code'],
            'type' => $type,
            'value' => $value,
            'discount' => $discount,
            'discount_amount' => $discount,
            'label' => $type === 'percentage'
                ? rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') . '% off'
                : '₹' . number_format($value, 2) . ' off',
        ], 'Coupon is valid.');
    }
}
