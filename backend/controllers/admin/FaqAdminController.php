<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class FaqAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC');
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'INSERT INTO faqs (question, answer, category, sort_order, status, created_at, updated_at)
             VALUES (:question, :answer, :category, :sort_order, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'question' => $input['question'],
            'answer' => $input['answer'],
            'category' => $input['category'] ?? 'general',
            'sort_order' => $input['sort_order'] ?? 0,
            'status' => $input['status'] ?? 'active',
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'FAQ created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE faqs SET question = :question, answer = :answer, category = :category,
             sort_order = :sort_order, status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'question' => $input['question'],
            'answer' => $input['answer'],
            'category' => $input['category'] ?? 'general',
            'sort_order' => $input['sort_order'] ?? 0,
            'status' => $input['status'] ?? 'active',
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'FAQ updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM faqs WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'FAQ deleted.');
    }
}
