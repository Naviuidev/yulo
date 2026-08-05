<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class NotificationController extends BaseController
{
    public function index(array $params = []): void
    {
        $userId = $this->authUserId();
        $pagination = Pagination::resolve();

        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id');
        $countStmt->execute(['user_id' => $userId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function markRead(array $params): void
    {
        $userId = $this->authUserId();

        $stmt = $this->db->prepare(
            'UPDATE notifications SET read_at = NOW() WHERE id = :id AND user_id = :user_id AND read_at IS NULL'
        );
        $stmt->execute(['id' => $params['id'], 'user_id' => $userId]);

        Response::jsonSuccess(null, 'Notification marked as read.');
    }

    public function markAllRead(array $params = []): void
    {
        $userId = $this->authUserId();
        $stmt = $this->db->prepare('UPDATE notifications SET read_at = NOW() WHERE user_id = :user_id AND read_at IS NULL');
        $stmt->execute(['user_id' => $userId]);
        Response::jsonSuccess(null, 'All notifications marked as read.');
    }
}
