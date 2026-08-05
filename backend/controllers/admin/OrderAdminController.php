<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class OrderAdminController extends BaseController
{
    private Order $orderModel;

    public function __construct()
    {
        parent::__construct();
        $this->orderModel = new Order($this->db);
    }

    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $status = $_GET['status'] ?? null;

        $where = '1=1';
        $bind = [];

        if ($status) {
            $where .= ' AND o.status = :status';
            $bind['status'] = $status;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM orders o WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT o.*, u.name as customer_name, u.email as customer_email
             FROM orders o JOIN users u ON u.id = o.user_id
             WHERE {$where} ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function show(array $params): void
    {
        $order = $this->orderModel->findById((int) $params['id']);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $order['items'] = $this->orderModel->getItems((int) $order['id']);
        Response::jsonSuccess($order);
    }

    public function updateStatus(array $params): void
    {
        $input = $this->getJsonInput();
        $allowed = [
            'pending', 'confirmed', 'processing', 'packed', 'shipped',
            'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded',
        ];

        if (empty($input['status']) || !in_array($input['status'], $allowed, true)) {
            Response::jsonError('Invalid status.', 422);
        }

        $stmt = $this->db->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['status' => $input['status'], 'id' => $params['id']]);

        if ($input['status'] === 'delivered') {
            $order = $this->orderModel->findById((int) $params['id']);
            if ($order) {
                $notif = $this->db->prepare(
                    'INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (:user_id, :title, :message, :type, NOW())'
                );
                $notif->execute([
                    'user_id' => $order['user_id'],
                    'title' => 'Order Delivered',
                    'message' => "Your order {$order['order_number']} has been delivered.",
                    'type' => 'order',
                ]);
            }
        }

        Response::jsonSuccess(null, 'Order status updated.');
    }
}
