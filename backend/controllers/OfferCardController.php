<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class OfferCardController extends BaseController
{
    /** Public: active offer card with popup enabled (homepage first visit). */
    public function show(array $params = []): void
    {
        $stmt = $this->db->query(
            'SELECT id, title, image, link, show_popup, updated_at
             FROM offer_cards
             WHERE status = \'active\' AND show_popup = 1
             ORDER BY id ASC
             LIMIT 1'
        );
        $row = $stmt->fetch();

        if (!$row) {
            Response::jsonSuccess(null);
            return;
        }

        $row['show_popup'] = true;
        Response::jsonSuccess($row);
    }
}
