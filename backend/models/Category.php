<?php

declare(strict_types=1);

final class Category
{
    public function __construct(private PDO $db)
    {
    }

    public function allActive(): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, slug, parent_id, image, description, sort_order
             FROM categories WHERE status = :status ORDER BY sort_order ASC, name ASC'
        );
        $stmt->execute(['status' => 'active']);
        return $stmt->fetchAll();
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM categories WHERE slug = :slug AND status = :status LIMIT 1');
        $stmt->execute(['slug' => $slug, 'status' => 'active']);
        return $stmt->fetch() ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM categories WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }
}
