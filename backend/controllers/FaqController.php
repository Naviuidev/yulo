<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class FaqController extends BaseController
{
    public function index(array $params = []): void
    {
        $category = $_GET['category'] ?? null;

        $sql = 'SELECT id, question, answer, category, sort_order FROM faqs WHERE status = :status';
        $params = ['status' => 'active'];

        if ($category) {
            $sql .= ' AND category = :category';
            $params['category'] = $category;
        }

        $sql .= ' ORDER BY sort_order ASC, id ASC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::jsonSuccess($stmt->fetchAll());
    }
}
