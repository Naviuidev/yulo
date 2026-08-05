<?php

declare(strict_types=1);

final class Review
{
    public function __construct(private PDO $db)
    {
    }

    public function listByProduct(int $productId, int $limit, int $offset): array
    {
        $countStmt = $this->db->prepare(
            'SELECT COUNT(*) FROM reviews WHERE product_id = :product_id AND status = :status'
        );
        $countStmt->execute(['product_id' => $productId, 'status' => 'approved']);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT r.*, u.name as user_name
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             WHERE r.product_id = :product_id AND r.status = :status
             ORDER BY r.created_at DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':product_id', $productId, PDO::PARAM_INT);
        $stmt->bindValue(':status', 'approved');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['items' => $stmt->fetchAll(), 'total' => $total];
    }

    public function averageRating(int $productId): float
    {
        $stmt = $this->db->prepare(
            'SELECT AVG(rating) FROM reviews WHERE product_id = :product_id AND status = :status'
        );
        $stmt->execute(['product_id' => $productId, 'status' => 'approved']);
        return round((float) $stmt->fetchColumn(), 1);
    }
}
