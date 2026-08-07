<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class FeaturedCollectionController extends BaseController
{
    /** Public active featured tiles (max 3) for homepage. */
    public function index(array $params = []): void
    {
        $stmt = $this->db->query(
            'SELECT id, title, image, link, cta_text, sort_order
             FROM featured_collections
             WHERE status = \'active\'
             ORDER BY sort_order ASC, id ASC
             LIMIT 3'
        );

        Response::jsonSuccess($stmt->fetchAll());
    }
}
