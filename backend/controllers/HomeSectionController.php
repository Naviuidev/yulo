<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class HomeSectionController extends BaseController
{
    /** Public active homepage sections (includes Flash Sale schedule). */
    public function index(array $params = []): void
    {
        SchemaGuard::ensureHomeSections($this->db);

        $stmt = $this->db->query(
            'SELECT id, name, slug, description, sort_order,
                    sale_start_date, sale_end_date, sale_start_time, sale_end_time
             FROM home_sections
             WHERE status = \'active\'
             ORDER BY sort_order ASC, id ASC'
        );
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['sale_start_time'] = $this->formatTime($row['sale_start_time'] ?? null);
            $row['sale_end_time'] = $this->formatTime($row['sale_end_time'] ?? null);
            $row['sale_ends_at'] = $this->combineDateTime(
                $row['sale_end_date'] ?? null,
                $row['sale_end_time'] ?? null
            );
            $row['sale_starts_at'] = $this->combineDateTime(
                $row['sale_start_date'] ?? null,
                $row['sale_start_time'] ?? null
            );
        }
        unset($row);

        Response::jsonSuccess($rows);
    }

    private function formatTime(mixed $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }
        return substr((string) $time, 0, 5);
    }

    private function combineDateTime(mixed $date, mixed $time): ?string
    {
        if (!$date || !$time) {
            return null;
        }
        $t = strlen((string) $time) === 5 ? $time . ':00' : $time;
        $ts = strtotime($date . ' ' . $t);
        return $ts ? date('c', $ts) : null;
    }
}
