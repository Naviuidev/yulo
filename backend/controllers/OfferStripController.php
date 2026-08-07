<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class OfferStripController extends BaseController
{
    /** Public active offer strips for the storefront top bar. */
    public function index(array $params = []): void
    {
        $stmt = $this->db->query(
            'SELECT id, text, is_scrolling, sort_order
             FROM offer_strips
             WHERE status = \'active\'
             ORDER BY sort_order ASC, id ASC'
        );

        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['is_scrolling'] = (bool) ((int) $row['is_scrolling']);
        }
        unset($row);

        Response::jsonSuccess($rows);
    }
}
