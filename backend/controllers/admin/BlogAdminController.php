<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class BlogAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $total = (int) $this->db->query('SELECT COUNT(*) FROM blogs')->fetchColumn();

        $stmt = $this->db->prepare('SELECT * FROM blogs ORDER BY created_at DESC LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();
        $user = $GLOBALS['auth_user'];

        $stmt = $this->db->prepare(
            'INSERT INTO blogs (title, slug, content, excerpt, image, author_id, status, published_at, created_at, updated_at)
             VALUES (:title, :slug, :content, :excerpt, :image, :author_id, :status, :published_at, NOW(), NOW())'
        );
        $stmt->execute([
            'title' => $input['title'],
            'slug' => $input['slug'],
            'content' => $input['content'],
            'excerpt' => $input['excerpt'] ?? null,
            'image' => $input['image'] ?? null,
            'author_id' => $user['id'],
            'status' => $input['status'] ?? 'draft',
            'published_at' => ($input['status'] ?? '') === 'published' ? date('Y-m-d H:i:s') : null,
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Blog created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE blogs SET title = :title, slug = :slug, content = :content, excerpt = :excerpt,
             image = :image, status = :status, published_at = COALESCE(:published_at, published_at), updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'title' => $input['title'],
            'slug' => $input['slug'],
            'content' => $input['content'],
            'excerpt' => $input['excerpt'] ?? null,
            'image' => $input['image'] ?? null,
            'status' => $input['status'],
            'published_at' => $input['status'] === 'published' ? date('Y-m-d H:i:s') : null,
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'Blog updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM blogs WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'Blog deleted.');
    }
}
