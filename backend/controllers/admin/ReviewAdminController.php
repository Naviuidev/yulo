<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class ReviewAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $pagination = Pagination::resolve();
        $status = trim((string) ($_GET['status'] ?? ''));

        $where = '1=1';
        $bind = [];
        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $where .= ' AND r.status = :status';
            $bind['status'] = $status;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM reviews r WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT r.*,
                    COALESCE(NULLIF(r.display_name, ''), u.name) AS customer_name,
                    u.email AS customer_email,
                    p.name AS product_name,
                    p.slug AS product_slug
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             JOIN products p ON p.id = r.product_id
             WHERE {$where}
             ORDER BY
                CASE r.status
                    WHEN 'pending' THEN 0
                    WHEN 'approved' THEN 1
                    ELSE 2
                END,
                r.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function updateStatus(array $params): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $id = (int) ($params['id'] ?? 0);
        $input = $this->getJsonInput();
        $status = (string) ($input['status'] ?? '');

        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            Response::jsonError('Invalid status.', 422);
        }

        $stmt = $this->db->prepare(
            'UPDATE reviews SET status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() === 0) {
            $check = $this->db->prepare('SELECT id FROM reviews WHERE id = :id LIMIT 1');
            $check->execute(['id' => $id]);
            if (!$check->fetch()) {
                Response::jsonError('Review not found.', 404);
            }
        }

        Response::jsonSuccess(['id' => $id, 'status' => $status], 'Review status updated.');
    }
}
