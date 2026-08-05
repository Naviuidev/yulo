<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class DeliveryAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $status = $_GET['status'] ?? null;

        $where = '1=1';
        $bind = [];

        if ($status) {
            $where .= ' AND d.status = :status';
            $bind['status'] = $status;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM deliveries d WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT d.*, o.order_number, u.name as customer_name
             FROM deliveries d
             JOIN orders o ON o.id = d.order_id
             JOIN users u ON u.id = o.user_id
             WHERE {$where} ORDER BY d.created_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'INSERT INTO deliveries (order_id, carrier, tracking_number, status, estimated_delivery, notes, created_at, updated_at)
             VALUES (:order_id, :carrier, :tracking_number, :status, :estimated_delivery, :notes, NOW(), NOW())'
        );
        $stmt->execute([
            'order_id' => $input['order_id'],
            'carrier' => $input['carrier'] ?? null,
            'tracking_number' => $input['tracking_number'] ?? null,
            'status' => $input['status'] ?? 'pending',
            'estimated_delivery' => $input['estimated_delivery'] ?? null,
            'notes' => $input['notes'] ?? null,
        ]);

        $updateOrder = $this->db->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id');
        $updateOrder->execute(['status' => 'shipped', 'id' => $input['order_id']]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Delivery created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE deliveries SET carrier = :carrier, tracking_number = :tracking_number, status = :status,
             estimated_delivery = :estimated_delivery, notes = :notes, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'carrier' => $input['carrier'] ?? null,
            'tracking_number' => $input['tracking_number'] ?? null,
            'status' => $input['status'],
            'estimated_delivery' => $input['estimated_delivery'] ?? null,
            'notes' => $input['notes'] ?? null,
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'Delivery updated.');
    }
}
