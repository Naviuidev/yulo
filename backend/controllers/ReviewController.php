<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class ReviewController extends BaseController
{
    private Review $reviewModel;

    public function __construct()
    {
        parent::__construct();
        $this->reviewModel = new Review($this->db);
    }

    public function index(array $params): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $productId = (int) $params['product_id'];
        $pagination = Pagination::resolve();
        $result = $this->reviewModel->listByProduct($productId, $pagination['limit'], $pagination['offset']);

        Response::jsonPaginate($result['items'], $result['total'], $pagination['page'], $pagination['per_page']);
    }

    /** Approved reviews for homepage testimonials. */
    public function testimonials(array $params = []): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $limit = max(1, min(48, (int) ($_GET['limit'] ?? 24)));

        $stmt = $this->db->prepare(
            'SELECT r.id, r.rating, r.comment, r.avatar_path, r.created_at,
                    COALESCE(NULLIF(r.display_name, \'\'), u.name) AS user_name,
                    p.name AS product_name, p.slug AS product_slug
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             JOIN products p ON p.id = r.product_id
             WHERE r.status = :status
             ORDER BY r.created_at DESC
             LIMIT :limit'
        );
        $stmt->bindValue(':status', 'approved');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonSuccess($stmt->fetchAll());
    }

    /** Products the logged-in user purchased (eligible for review). */
    public function purchasedProducts(array $params = []): void
    {
        $userId = $this->authUserId();

        $stmt = $this->db->prepare(
            'SELECT DISTINCT p.id, p.name, p.slug,
                    (SELECT image_path FROM product_images pi
                     WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) AS primary_image
             FROM order_items oi
             INNER JOIN orders o ON o.id = oi.order_id
             INNER JOIN products p ON p.id = oi.product_id
             WHERE o.user_id = :user_id
               AND o.payment_status = :paid
               AND o.status IN (\'delivered\', \'confirmed\', \'shipped\')
             ORDER BY p.name ASC'
        );
        $stmt->execute(['user_id' => $userId, 'paid' => 'paid']);

        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        SchemaGuard::ensureReviewExtras($this->db);
        $input = $this->getInput();
        $userId = $this->authUserId();

        $validator = Validator::make($input)
            ->required('product_id')
            ->integer('product_id')
            ->required('rating')
            ->integer('rating')
            ->required('comment')
            ->required('full_name');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $rating = (int) $input['rating'];
        if ($rating < 1 || $rating > 5) {
            Response::jsonError('Rating must be between 1 and 5.', 422);
        }

        $fullName = trim((string) $input['full_name']);
        if ($fullName === '' || mb_strlen($fullName) < 2) {
            Response::jsonError('Please enter your full name.', 422);
        }

        $comment = trim((string) $input['comment']);
        if ($comment === '') {
            Response::jsonError('Please enter a comment.', 422);
        }

        $productId = (int) $input['product_id'];

        $orderCheck = $this->db->prepare(
            'SELECT oi.id FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = :user_id AND oi.product_id = :product_id
               AND o.payment_status = :paid
               AND o.status IN (\'delivered\', \'confirmed\', \'shipped\')
             LIMIT 1'
        );
        $orderCheck->execute([
            'user_id' => $userId,
            'product_id' => $productId,
            'paid' => 'paid',
        ]);
        if (!$orderCheck->fetch()) {
            Response::jsonError('You can only review products you have purchased.', 403);
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

        $existing = $this->db->prepare(
            'SELECT id, avatar_path FROM reviews WHERE product_id = :product_id AND user_id = :user_id LIMIT 1'
        );
        $existing->execute(['product_id' => $productId, 'user_id' => $userId]);
        $row = $existing->fetch();

        if ($row) {
            $stmt = $this->db->prepare(
                'UPDATE reviews
                 SET rating = :rating,
                     title = :title,
                     comment = :comment,
                     display_name = :display_name,
                     avatar_path = COALESCE(:avatar_path, avatar_path),
                     status = :status,
                     updated_at = NOW()
                 WHERE id = :id'
            );
            $stmt->execute([
                'id' => $row['id'],
                'rating' => $rating,
                'title' => $input['title'] ?? null,
                'comment' => $comment,
                'display_name' => $fullName,
                'avatar_path' => $avatarPath,
                'status' => 'pending',
            ]);
            Response::jsonSuccess(['id' => (int) $row['id']], 'Review submitted for approval.');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO reviews
                (product_id, user_id, rating, title, comment, display_name, avatar_path, status, created_at, updated_at)
             VALUES
                (:product_id, :user_id, :rating, :title, :comment, :display_name, :avatar_path, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'product_id' => $productId,
            'user_id' => $userId,
            'rating' => $rating,
            'title' => $input['title'] ?? null,
            'comment' => $comment,
            'display_name' => $fullName,
            'avatar_path' => $avatarPath,
            'status' => 'pending',
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Review submitted for approval.', 201);
    }
}
