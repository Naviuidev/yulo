<?php

declare(strict_types=1);

final class Response
{
    public static function jsonSuccess(
        mixed $data = null,
        string $message = 'Success',
        int $statusCode = 200,
        array $headers = []
    ): void {
        self::send([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'errors' => (object) [],
        ], $statusCode, $headers);
    }

    public static function jsonError(
        string $message = 'An error occurred',
        int $statusCode = 400,
        array $errors = [],
        mixed $data = null
    ): void {
        self::send([
            'success' => false,
            'message' => $message,
            'data' => $data,
            'errors' => empty($errors) ? (object) [] : $errors,
        ], $statusCode);
    }

    public static function jsonPaginate(
        array $items,
        int $total,
        int $page,
        int $perPage,
        string $message = 'Success',
        array $meta = []
    ): void {
        $totalPages = $perPage > 0 ? (int) ceil($total / $perPage) : 0;

        self::send([
            'success' => true,
            'message' => $message,
            'data' => $items,
            'errors' => (object) [],
            'pagination' => array_merge([
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => $totalPages,
                'has_more' => $page < $totalPages,
            ], $meta),
        ], 200, [
            'X-Total-Count' => (string) $total,
            'X-Page' => (string) $page,
            'X-Per-Page' => (string) $perPage,
        ]);
    }

    private static function send(array $payload, int $statusCode, array $headers = []): void
    {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');

            foreach ($headers as $name => $value) {
                header(sprintf('%s: %s', $name, $value));
            }
        }

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
