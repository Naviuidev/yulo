<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class RewardsController extends BaseController
{
    public function index(array $params = []): void
    {
        $userId = $this->authUserId();

        $pointsStmt = $this->db->prepare('SELECT COALESCE(SUM(points), 0) as total_points FROM rewards WHERE user_id = :user_id');
        $pointsStmt->execute(['user_id' => $userId]);
        $totalPoints = (int) $pointsStmt->fetchColumn();

        $pagination = Pagination::resolve();
        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM rewards WHERE user_id = :user_id');
        $countStmt->execute(['user_id' => $userId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT * FROM rewards WHERE user_id = :user_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonSuccess([
            'total_points' => $totalPoints,
            'history' => $stmt->fetchAll(),
            'pagination' => Pagination::buildMeta($total, $pagination['page'], $pagination['per_page']),
        ]);
    }
}
