<?php

declare(strict_types=1);

final class Pagination
{
    public static function resolve(?int $page = null, ?int $perPage = null, int $defaultPerPage = 15, int $maxPerPage = 100): array
    {
        $page = max(1, $page ?? (int) ($_GET['page'] ?? 1));
        $perPage = min($maxPerPage, max(1, $perPage ?? (int) ($_GET['per_page'] ?? $defaultPerPage)));
        $offset = ($page - 1) * $perPage;

        return [
            'page' => $page,
            'per_page' => $perPage,
            'offset' => $offset,
            'limit' => $perPage,
        ];
    }

    public static function buildMeta(int $total, int $page, int $perPage): array
    {
        $totalPages = $perPage > 0 ? (int) ceil($total / $perPage) : 0;

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => $totalPages,
            'has_more' => $page < $totalPages,
        ];
    }
}
