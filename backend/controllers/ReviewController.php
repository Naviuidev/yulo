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
        $productId = (int) $params['product_id'];
        $pagination = Pagination::resolve();
        $result = $this->reviewModel->listByProduct($productId, $pagination['limit'], $pagination['offset']);

        Response::jsonPaginate($result['items'], $result['total'], $pagination['page'], $pagination['per_page']);
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        $validator = Validator::make($input)
            ->required('product_id')
            ->integer('product_id')
            ->required('rating')
            ->integer('rating')
            ->required('comment');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $rating = (int) $input['rating'];
        if ($rating < 1 || $rating > 5) {
            Response::jsonError('Rating must be between 1 and 5.', 422);
        }

        $orderCheck = $this->db->prepare(
            'SELECT oi.id FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = :user_id AND oi.product_id = :product_id AND o.status = :status LIMIT 1'
        );
        $orderCheck->execute(['user_id' => $userId, 'product_id' => $input['product_id'], 'status' => 'delivered']);
        if (!$orderCheck->fetch()) {
            Response::jsonError('You can only review products you have purchased and received.', 403);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO reviews (product_id, user_id, rating, title, comment, status, created_at, updated_at)
             VALUES (:product_id, :user_id, :rating, :title, :comment, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'product_id' => $input['product_id'],
            'user_id' => $userId,
            'rating' => $rating,
            'title' => $input['title'] ?? null,
            'comment' => $input['comment'],
            'status' => 'pending',
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Review submitted for approval.', 201);
    }
}
