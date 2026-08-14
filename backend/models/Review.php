<?php

declare(strict_types=1);

final class Review
{
    public function __construct(private PDO $db)
    {
    }

    public function listByProduct(int $productId, int $limit, int $offset): array
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $countStmt = $this->db->prepare(
            'SELECT COUNT(*) FROM reviews WHERE product_id = :product_id AND status = :status'
        );
        $countStmt->execute(['product_id' => $productId, 'status' => 'approved']);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT r.*,
                    COALESCE(NULLIF(r.display_name, \'\'), u.name) AS user_name,
                    r.avatar_path
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
            'SELECT AVG(r.rating)
             FROM reviews r
             WHERE r.product_id = :product_id
               AND r.status = :status
               AND EXISTS (
                    SELECT 1
                    FROM order_items oi
                    INNER JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = r.product_id
                      AND o.user_id = r.user_id
                      AND o.payment_status = :paid
               )'
        );
        $stmt->execute([
            'product_id' => $productId,
            'status' => 'approved',
            'paid' => 'paid',
        ]);
        return round((float) $stmt->fetchColumn(), 1);
    }

    /** @return array{average_rating:float,review_count:int,rating_percent:int} */
    public function statsForProduct(int $productId): array
    {
        $stmt = $this->db->prepare(
            'SELECT
                COALESCE(AVG(r.rating), 0) AS average_rating,
                COUNT(*) AS review_count
             FROM reviews r
             WHERE r.product_id = :product_id
               AND r.status = :status
               AND EXISTS (
                    SELECT 1
                    FROM order_items oi
                    INNER JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = r.product_id
                      AND o.user_id = r.user_id
                      AND o.payment_status = :paid
               )'
        );
        $stmt->execute([
            'product_id' => $productId,
            'status' => 'approved',
            'paid' => 'paid',
        ]);
        $row = $stmt->fetch() ?: [];
        $avg = round((float) ($row['average_rating'] ?? 0), 1);
        $count = (int) ($row['review_count'] ?? 0);

        return [
            'average_rating' => $avg,
            'review_count' => $count,
            'rating_percent' => (int) round(($avg / 5) * 100),
        ];
    }

    /** SQL select fragments for product joins (verified-purchase approved reviews). */
    public static function productSelectSql(string $productAlias = 'p'): string
    {
        $p = $productAlias;
        return "
            COALESCE((
                SELECT AVG(r.rating)
                FROM reviews r
                WHERE r.product_id = {$p}.id
                  AND r.status = 'approved'
                  AND EXISTS (
                    SELECT 1 FROM order_items oi
                    INNER JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = r.product_id
                      AND o.user_id = r.user_id
                      AND o.payment_status = 'paid'
                  )
            ), 0) AS average_rating,
            (
                SELECT COUNT(*)
                FROM reviews r
                WHERE r.product_id = {$p}.id
                  AND r.status = 'approved'
                  AND EXISTS (
                    SELECT 1 FROM order_items oi
                    INNER JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_id = r.product_id
                      AND o.user_id = r.user_id
                      AND o.payment_status = 'paid'
                  )
            ) AS review_count
        ";
    }

    /** @param list<array<string,mixed>> $products */
    public static function enrichProducts(array $products): array
    {
        foreach ($products as &$product) {
            $avg = round((float) ($product['average_rating'] ?? 0), 1);
            $count = (int) ($product['review_count'] ?? 0);
            $product['average_rating'] = $avg;
            $product['review_count'] = $count;
            $product['rating_percent'] = (int) round(($avg / 5) * 100);
        }
        unset($product);
        return $products;
    }
}
