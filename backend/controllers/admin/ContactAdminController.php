<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/** Admin inbox for Contact Us form submissions. */
final class ContactAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $status = trim((string) ($_GET['status'] ?? ''));

        $where = '1=1';
        $bind = [];
        if (in_array($status, ['new', 'read', 'replied'], true)) {
            $where .= ' AND status = :status';
            $bind['status'] = $status;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM contact_messages WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT * FROM contact_messages
             WHERE {$where}
             ORDER BY created_at DESC
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
        $id = (int) ($params['id'] ?? 0);
        $input = $this->getJsonInput();
        $status = (string) ($input['status'] ?? '');

        if (!in_array($status, ['new', 'read', 'replied'], true)) {
            Response::jsonError('Invalid status.', 422);
        }

        $stmt = $this->db->prepare('UPDATE contact_messages SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() === 0) {
            $check = $this->db->prepare('SELECT id FROM contact_messages WHERE id = :id LIMIT 1');
            $check->execute(['id' => $id]);
            if (!$check->fetch()) {
                Response::jsonError('Contact message not found.', 404);
            }
        }

        Response::jsonSuccess(['id' => $id, 'status' => $status], 'Status updated.');
    }

    public function destroy(array $params): void
    {
        $id = (int) ($params['id'] ?? 0);
        $stmt = $this->db->prepare('DELETE FROM contact_messages WHERE id = :id');
        $stmt->execute(['id' => $id]);

        if ($stmt->rowCount() === 0) {
            Response::jsonError('Contact message not found.', 404);
        }

        Response::jsonSuccess(null, 'Contact message deleted.');
    }
}
