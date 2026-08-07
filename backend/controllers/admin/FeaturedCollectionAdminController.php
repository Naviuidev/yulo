<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class FeaturedCollectionAdminController extends BaseController
{
    private const MAX_ITEMS = 3;

    public function index(array $params = []): void
    {
        $stmt = $this->db->query(
            'SELECT * FROM featured_collections ORDER BY sort_order ASC, id ASC'
        );
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        $input = $this->normalize($this->getJsonInput());

        if ($input['title'] === '' || $input['image'] === '') {
            Response::jsonError('Title and image are required.', 422);
            return;
        }

        if ($input['status'] === 'active' && !$this->assertLimit(null)) {
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO featured_collections
                (title, image, link, cta_text, sort_order, status, created_at, updated_at)
             VALUES
                (:title, :image, :link, :cta_text, :sort_order, :status, NOW(), NOW())'
        );
        $stmt->execute($input);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Featured item created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->normalize($this->getJsonInput());
        $id = (int) ($params['id'] ?? 0);

        if ($input['title'] === '' || $input['image'] === '') {
            Response::jsonError('Title and image are required.', 422);
            return;
        }

        if ($input['status'] === 'active' && !$this->assertLimit($id)) {
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE featured_collections
             SET title = :title, image = :image, link = :link, cta_text = :cta_text,
                 sort_order = :sort_order, status = :status, updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            ...$input,
            'id' => $id,
        ]);

        Response::jsonSuccess(null, 'Featured item updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM featured_collections WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'Featured item deleted.');
    }

    /** @return array{title:string,image:string,link:?string,cta_text:?string,sort_order:int,status:string} */
    private function normalize(array $input): array
    {
        $image = trim((string) ($input['image'] ?? $input['image_url'] ?? ''));
        $link = trim((string) ($input['link'] ?? $input['link_url'] ?? ''));
        $cta = trim((string) ($input['cta_text'] ?? ''));

        return [
            'title' => trim((string) ($input['title'] ?? '')),
            'image' => $image,
            'link' => $link !== '' ? $link : null,
            'cta_text' => $cta !== '' ? $cta : null,
            'sort_order' => (int) ($input['sort_order'] ?? 0),
            'status' => (($input['status'] ?? 'active') === 'inactive') ? 'inactive' : 'active',
        ];
    }

    private function assertLimit(?int $excludeId): bool
    {
        $sql = 'SELECT COUNT(*) FROM featured_collections WHERE status = \'active\'';
        $bind = [];
        if ($excludeId) {
            $sql .= ' AND id != :id';
            $bind['id'] = $excludeId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($bind);
        $count = (int) $stmt->fetchColumn();

        if ($count >= self::MAX_ITEMS) {
            Response::jsonError('Maximum ' . self::MAX_ITEMS . ' active Featured Collection images allowed.', 422);
            return false;
        }

        return true;
    }
}
