<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class CustomerAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $search = $_GET['search'] ?? '';

        $where = "u.role = 'customer'";
        $bind = [];

        if ($search) {
            $where .= ' AND (u.name LIKE :search OR u.email LIKE :search)';
            $bind['search'] = '%' . $search . '%';
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users u WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
                    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
                    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = u.id AND payment_status = 'paid') as total_spent
             FROM users u WHERE {$where} ORDER BY u.created_at DESC LIMIT :limit OFFSET :offset"
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
        $userModel = new User($this->db);
        $user = $userModel->findById((int) $params['id']);

        if (!$user || $user['role'] !== 'customer') {
            Response::jsonError('Customer not found.', 404);
        }

        $orders = $this->db->prepare('SELECT id, order_number, total, status, created_at FROM orders WHERE user_id = :id ORDER BY created_at DESC LIMIT 10');
        $orders->execute(['id' => $params['id']]);

        Response::jsonSuccess(['customer' => $user, 'recent_orders' => $orders->fetchAll()]);
    }

    public function updateStatus(array $params): void
    {
        $input = $this->getJsonInput();
        $stmt = $this->db->prepare('UPDATE users SET status = :status, updated_at = NOW() WHERE id = :id AND role = :role');
        $stmt->execute(['status' => $input['status'], 'id' => $params['id'], 'role' => 'customer']);
        Response::jsonSuccess(null, 'Customer status updated.');
    }
}
