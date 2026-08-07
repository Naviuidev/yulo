<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class BannerController extends BaseController
{
    /** Public active banners (homepage hero uses position=home, max 3). */
    public function index(array $params = []): void
    {
        $position = trim((string) ($_GET['position'] ?? 'home'));
        $limit = max(1, min(3, (int) ($_GET['limit'] ?? 3)));

        $sql = 'SELECT id, title, image, link, position, sort_order
                FROM banners
                WHERE status = :status';
        $bind = ['status' => 'active'];

        if ($position !== '') {
            $sql .= ' AND position = :position';
            $bind['position'] = $position;
        }

        $sql .= ' ORDER BY sort_order ASC, id ASC LIMIT ' . $limit;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($bind);

        Response::jsonSuccess($stmt->fetchAll());
    }
}
