<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class HomeSectionAdminController extends BaseController
{
    private const FLASH_SLUG = 'flash-sale';

    public function index(array $params = []): void
    {
        SchemaGuard::ensureHomeSections($this->db);

        $stmt = $this->db->query(
            'SELECT s.*,
                    (SELECT COUNT(*) FROM product_home_sections phs WHERE phs.section_id = s.id) AS product_count
             FROM home_sections s
             ORDER BY s.sort_order ASC, s.id ASC'
        );
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['is_locked'] = (bool) ((int) ($row['is_locked'] ?? 0));
            $row['sale_start_time'] = $this->formatTime($row['sale_start_time'] ?? null);
            $row['sale_end_time'] = $this->formatTime($row['sale_end_time'] ?? null);
        }
        unset($row);

        Response::jsonSuccess($rows);
    }

    public function store(array $params = []): void
    {
        $input = $this->normalize($this->getJsonInput());

        if ($input['name'] === '' || $input['slug'] === '') {
            Response::jsonError('Name and slug are required.', 422);
            return;
        }

        if ($input['slug'] === self::FLASH_SLUG) {
            Response::jsonError('Flash Sale section already exists and cannot be recreated.', 422);
            return;
        }

        if ($this->slugExists($input['slug'])) {
            Response::jsonError('Slug already exists.', 422);
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO home_sections
                (name, slug, description, sort_order, status, is_locked, created_at, updated_at)
             VALUES
                (:name, :slug, :description, :sort_order, :status, 0, NOW(), NOW())'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'description' => $input['description'],
            'sort_order' => $input['sort_order'],
            'status' => $input['status'],
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Section created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->normalize($this->getJsonInput());
        $id = (int) ($params['id'] ?? 0);
        $existing = $this->findById($id);

        if (!$existing) {
            Response::jsonError('Section not found.', 404);
            return;
        }

        // Locked Flash Sale: keep slug fixed
        if ((int) ($existing['is_locked'] ?? 0) === 1 || $existing['slug'] === self::FLASH_SLUG) {
            $input['slug'] = self::FLASH_SLUG;
        }

        if ($input['name'] === '' || $input['slug'] === '') {
            Response::jsonError('Name and slug are required.', 422);
            return;
        }

        if ($this->slugExists($input['slug'], $id)) {
            Response::jsonError('Slug already exists.', 422);
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE home_sections
             SET name = :name, slug = :slug, description = :description,
                 sort_order = :sort_order, status = :status, updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'description' => $input['description'],
            'sort_order' => $input['sort_order'],
            'status' => $input['status'],
            'id' => $id,
        ]);

        Response::jsonSuccess(null, 'Section updated.');
    }

    /** Update Flash Sale schedule (Configure Sales). */
    public function updateSalesConfig(array $params = []): void
    {
        $input = $this->getJsonInput();
        $flash = $this->findBySlug(self::FLASH_SLUG);

        if (!$flash) {
            Response::jsonError('Flash Sale section not found.', 404);
            return;
        }

        $startDate = trim((string) ($input['sale_start_date'] ?? ''));
        $endDate = trim((string) ($input['sale_end_date'] ?? ''));
        $startTime = $this->normalizeTime($input['sale_start_time'] ?? null);
        $endTime = $this->normalizeTime($input['sale_end_time'] ?? null);

        if ($startDate === '' || $endDate === '' || $startTime === null || $endTime === null) {
            Response::jsonError('Sale start/end date and time are all required.', 422);
            return;
        }

        $startAt = strtotime($startDate . ' ' . $startTime);
        $endAt = strtotime($endDate . ' ' . $endTime);
        if ($startAt === false || $endAt === false) {
            Response::jsonError('Invalid sale date or time.', 422);
            return;
        }
        if ($endAt <= $startAt) {
            Response::jsonError('Sale end must be after sale start.', 422);
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE home_sections
             SET sale_start_date = :sale_start_date,
                 sale_end_date = :sale_end_date,
                 sale_start_time = :sale_start_time,
                 sale_end_time = :sale_end_time,
                 updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'sale_start_date' => $startDate,
            'sale_end_date' => $endDate,
            'sale_start_time' => $startTime,
            'sale_end_time' => $endTime,
            'id' => (int) $flash['id'],
        ]);

        Response::jsonSuccess([
            'sale_start_date' => $startDate,
            'sale_end_date' => $endDate,
            'sale_start_time' => substr($startTime, 0, 5),
            'sale_end_time' => substr($endTime, 0, 5),
        ], 'Flash Sale schedule updated.');
    }

    /** Clear Flash Sale schedule dates/times (section itself stays). */
    public function clearSalesConfig(array $params = []): void
    {
        $flash = $this->findBySlug(self::FLASH_SLUG);

        if (!$flash) {
            Response::jsonError('Flash Sale section not found.', 404);
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE home_sections
             SET sale_start_date = NULL,
                 sale_end_date = NULL,
                 sale_start_time = NULL,
                 sale_end_time = NULL,
                 updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute(['id' => (int) $flash['id']]);

        Response::jsonSuccess(null, 'Flash Sale schedule deleted.');
    }

    public function destroy(array $params): void
    {
        $id = (int) ($params['id'] ?? 0);
        $existing = $this->findById($id);

        if (!$existing) {
            Response::jsonError('Section not found.', 404);
            return;
        }

        if ((int) ($existing['is_locked'] ?? 0) === 1 || $existing['slug'] === self::FLASH_SLUG) {
            Response::jsonError('Flash Sale section cannot be deleted.', 422);
            return;
        }

        $stmt = $this->db->prepare('DELETE FROM home_sections WHERE id = :id');
        $stmt->execute(['id' => $id]);
        Response::jsonSuccess(null, 'Section deleted.');
    }

    /** @return array{name:string,slug:string,description:?string,sort_order:int,status:string} */
    private function normalize(array $input): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        $slug = trim((string) ($input['slug'] ?? ''));
        if ($slug === '' && $name !== '') {
            $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? '', '-'));
        }

        $desc = trim((string) ($input['description'] ?? ''));

        return [
            'name' => $name,
            'slug' => $slug,
            'description' => $desc !== '' ? $desc : null,
            'sort_order' => (int) ($input['sort_order'] ?? 0),
            'status' => (($input['status'] ?? 'active') === 'inactive') ? 'inactive' : 'active',
        ];
    }

    private function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM home_sections WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM home_sections WHERE slug = :slug LIMIT 1');
        $stmt->execute(['slug' => $slug]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private function slugExists(string $slug, ?int $excludeId = null): bool
    {
        $sql = 'SELECT COUNT(*) FROM home_sections WHERE slug = :slug';
        $bind = ['slug' => $slug];
        if ($excludeId) {
            $sql .= ' AND id != :id';
            $bind['id'] = $excludeId;
        }
        $stmt = $this->db->prepare($sql);
        $stmt->execute($bind);
        return (int) $stmt->fetchColumn() > 0;
    }

    private function formatTime(mixed $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }
        $str = (string) $time;
        return substr($str, 0, 5);
    }

    private function normalizeTime(mixed $time): ?string
    {
        $str = trim((string) $time);
        if ($str === '') {
            return null;
        }
        if (preg_match('/^\d{2}:\d{2}$/', $str)) {
            return $str . ':00';
        }
        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $str)) {
            return $str;
        }
        return null;
    }
}
