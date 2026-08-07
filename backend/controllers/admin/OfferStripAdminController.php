<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class OfferStripAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM offer_strips ORDER BY sort_order ASC, id ASC');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['is_scrolling'] = (bool) ((int) $row['is_scrolling']);
        }
        unset($row);

        Response::jsonSuccess($rows);
    }

    public function store(array $params = []): void
    {
        $input = $this->normalize($this->getJsonInput());
        if ($input['text'] === '') {
            Response::jsonError('Offer text is required.', 422);
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO offer_strips (text, is_scrolling, sort_order, status, created_at, updated_at)
             VALUES (:text, :is_scrolling, :sort_order, :status, NOW(), NOW())'
        );
        $stmt->execute($input);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Offer strip created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->normalize($this->getJsonInput());
        if ($input['text'] === '') {
            Response::jsonError('Offer text is required.', 422);
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE offer_strips
             SET text = :text, is_scrolling = :is_scrolling, sort_order = :sort_order,
                 status = :status, updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            ...$input,
            'id' => (int) ($params['id'] ?? 0),
        ]);

        Response::jsonSuccess(null, 'Offer strip updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM offer_strips WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'Offer strip deleted.');
    }

    /** @return array{text:string,is_scrolling:int,sort_order:int,status:string} */
    private function normalize(array $input): array
    {
        $scrolling = $input['is_scrolling'] ?? $input['scroll'] ?? false;

        return [
            'text' => trim((string) ($input['text'] ?? '')),
            'is_scrolling' => filter_var($scrolling, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'sort_order' => (int) ($input['sort_order'] ?? 0),
            'status' => (($input['status'] ?? 'active') === 'inactive') ? 'inactive' : 'active',
        ];
    }
}
