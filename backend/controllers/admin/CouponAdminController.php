<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class CouponAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $total = (int) $this->db->query('SELECT COUNT(*) FROM coupons')->fetchColumn();

        $stmt = $this->db->prepare('SELECT * FROM coupons ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'INSERT INTO coupons (code, type, value, min_order_amount, max_discount, max_uses, used_count, expires_at, status, created_at, updated_at)
             VALUES (:code, :type, :value, :min_order_amount, :max_discount, :max_uses, 0, :expires_at, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'code' => strtoupper($input['code']),
            'type' => $input['type'] ?? 'percentage',
            'value' => $input['value'],
            'min_order_amount' => $input['min_order_amount'] ?? 0,
            'max_discount' => $input['max_discount'] ?? null,
            'max_uses' => $input['max_uses'] ?? null,
            'expires_at' => $input['expires_at'] ?? null,
            'status' => $input['status'] ?? 'active',
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Coupon created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE coupons SET code = :code, type = :type, value = :value, min_order_amount = :min_order_amount,
             max_discount = :max_discount, max_uses = :max_uses, expires_at = :expires_at, status = :status, updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'code' => strtoupper($input['code']),
            'type' => $input['type'],
            'value' => $input['value'],
            'min_order_amount' => $input['min_order_amount'] ?? 0,
            'max_discount' => $input['max_discount'] ?? null,
            'max_uses' => $input['max_uses'] ?? null,
            'expires_at' => $input['expires_at'] ?? null,
            'status' => $input['status'] ?? 'active',
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'Coupon updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM coupons WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'Coupon deleted.');
    }
}
