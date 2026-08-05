<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class BlogController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();

        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM blogs WHERE status = :status');
        $countStmt->execute(['status' => 'published']);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT b.id, b.title, b.slug, b.excerpt, b.image, b.published_at, u.name as author_name
             FROM blogs b
             LEFT JOIN users u ON u.id = b.author_id
             WHERE b.status = :status
             ORDER BY b.published_at DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':status', 'published');
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function show(array $params): void
    {
        $stmt = $this->db->prepare(
            'SELECT b.*, u.name as author_name FROM blogs b
             LEFT JOIN users u ON u.id = b.author_id
             WHERE b.slug = :slug AND b.status = :status LIMIT 1'
        );
        $stmt->execute(['slug' => $params['slug'], 'status' => 'published']);
        $blog = $stmt->fetch();

        if (!$blog) {
            Response::jsonError('Blog post not found.', 404);
        }

        Response::jsonSuccess($blog);
    }
}
