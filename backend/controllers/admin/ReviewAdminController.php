<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class ReviewAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $pagination = Pagination::resolve();
        $status = trim((string) ($_GET['status'] ?? ''));

        $where = '1=1';
        $bind = [];
        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $where .= ' AND r.status = :status';
            $bind['status'] = $status;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM reviews r WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT r.*,
                    COALESCE(NULLIF(r.display_name, ''), u.name) AS customer_name,
                    u.email AS customer_email,
                    p.name AS product_name,
                    p.slug AS product_slug
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             JOIN products p ON p.id = r.product_id
             WHERE {$where}
             ORDER BY
                CASE r.status
                    WHEN 'pending' THEN 0
                    WHEN 'approved' THEN 1
                    ELSE 2
                END,
                r.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function updateStatus(array $params): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $id = (int) ($params['id'] ?? 0);
        $input = $this->getJsonInput();
        $status = (string) ($input['status'] ?? '');

        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            Response::jsonError('Invalid status.', 422);
        }

        $stmt = $this->db->prepare(
            'UPDATE reviews SET status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute(['status' => $status, 'id' => $id]);

        if ($stmt->rowCount() === 0) {
            $check = $this->db->prepare('SELECT id FROM reviews WHERE id = :id LIMIT 1');
            $check->execute(['id' => $id]);
            if (!$check->fetch()) {
                Response::jsonError('Review not found.', 404);
            }
        }

        Response::jsonSuccess(['id' => $id, 'status' => $status], 'Review status updated.');
    }

    /**
     * Admin-created “static” review (no purchase check).
     * Used to seed / dump testimonials from Admin → Reviews → Static Reviews.
     */
    public function storeStatic(array $params = []): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $adminId = $this->authUserId();
        if (!$adminId) {
            Response::jsonError('Unauthorized.', 401);
        }

        $input = $this->getInput();
        $productId = (int) ($input['product_id'] ?? 0);
        $rating = (int) ($input['rating'] ?? 0);
        $fullName = trim((string) ($input['full_name'] ?? $input['display_name'] ?? ''));
        $comment = trim((string) ($input['comment'] ?? ''));
        $title = trim((string) ($input['title'] ?? ''));
        $status = trim((string) ($input['status'] ?? 'approved'));

        if ($productId < 1) {
            Response::jsonError('Select a product.', 422);
        }
        if ($rating < 1 || $rating > 5) {
            Response::jsonError('Rating must be between 1 and 5.', 422);
        }
        if ($fullName === '' || mb_strlen($fullName) < 2) {
            Response::jsonError('Enter a customer display name.', 422);
        }
        if ($comment === '') {
            Response::jsonError('Enter a review comment.', 422);
        }
        if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $status = 'approved';
        }

        $product = $this->db->prepare('SELECT id FROM products WHERE id = :id LIMIT 1');
        $product->execute(['id' => $productId]);
        if (!$product->fetch()) {
            Response::jsonError('Product not found.', 404);
        }

        $avatarPath = null;
        if (!empty($_FILES['avatar']) && (int) ($_FILES['avatar']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $uploader = new Uploader();
            $result = $uploader->upload($_FILES['avatar'], 'reviews');
            if (!$result['success']) {
                Response::jsonError($result['message'] ?? 'Avatar upload failed.', 422);
            }
            $avatarPath = $result['path'] ?? null;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO reviews
                (product_id, user_id, rating, title, comment, display_name, avatar_path, status, created_at, updated_at)
             VALUES
                (:product_id, :user_id, :rating, :title, :comment, :display_name, :avatar_path, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'product_id' => $productId,
            'user_id' => $adminId,
            'rating' => $rating,
            'title' => $title !== '' ? $title : null,
            'comment' => $comment,
            'display_name' => $fullName,
            'avatar_path' => $avatarPath,
            'status' => $status,
        ]);

        Response::jsonSuccess(
            [
                'id' => (int) $this->db->lastInsertId(),
                'status' => $status,
                'product_id' => $productId,
            ],
            $status === 'approved'
                ? 'Static review added and published.'
                : 'Static review added.',
            201
        );
    }
}
