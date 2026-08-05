<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class CmsController extends BaseController
{
    public function show(array $params): void
    {
        $stmt = $this->db->prepare('SELECT title, slug, content, meta_title, meta_description FROM cms_pages WHERE slug = :slug AND status = :status LIMIT 1');
        $stmt->execute(['slug' => $params['slug'], 'status' => 'published']);
        $page = $stmt->fetch();

        if (!$page) {
            Response::jsonError('Page not found.', 404);
        }

        Response::jsonSuccess($page);
    }
}
