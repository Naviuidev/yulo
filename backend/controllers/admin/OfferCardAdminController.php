<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class OfferCardAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM offer_cards ORDER BY id ASC LIMIT 1');
        $row = $stmt->fetch();

        if ($row) {
            $row['show_popup'] = (bool) ((int) $row['show_popup']);
        }

        Response::jsonSuccess($row ?: null);
    }

    public function store(array $params = []): void
    {
        $count = (int) $this->db->query('SELECT COUNT(*) FROM offer_cards')->fetchColumn();
        if ($count >= 1) {
            Response::jsonError('Only one offer banner card is allowed. Edit or delete the existing card.', 422);
            return;
        }

        $input = $this->normalize($this->getJsonInput());
        if ($input['image'] === '') {
            Response::jsonError('Offer banner image URL is required.', 422);
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO offer_cards (title, image, link, show_popup, status, created_at, updated_at)
             VALUES (:title, :image, :link, :show_popup, :status, NOW(), NOW())'
        );
        $stmt->execute($input);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Offer card created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->normalize($this->getJsonInput());
        if ($input['image'] === '') {
            Response::jsonError('Offer banner image URL is required.', 422);
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE offer_cards
             SET title = :title, image = :image, link = :link, show_popup = :show_popup,
                 status = :status, updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            ...$input,
            'id' => (int) ($params['id'] ?? 0),
        ]);

        Response::jsonSuccess(null, 'Offer card updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM offer_cards WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'Offer card deleted.');
    }

    /** @return array{title:?string,image:string,link:?string,show_popup:int,status:string} */
    private function normalize(array $input): array
    {
        $image = trim((string) ($input['image'] ?? $input['image_url'] ?? ''));
        $link = trim((string) ($input['link'] ?? $input['link_url'] ?? ''));
        $popup = $input['show_popup'] ?? false;

        return [
            'title' => isset($input['title']) ? trim((string) $input['title']) : null,
            'image' => $image,
            'link' => $link !== '' ? $link : null,
            'show_popup' => filter_var($popup, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
            'status' => (($input['status'] ?? 'active') === 'inactive') ? 'inactive' : 'active',
        ];
    }
}
