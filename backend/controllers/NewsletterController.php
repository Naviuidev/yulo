<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class NewsletterController extends BaseController
{
    public function subscribe(array $params = []): void
    {
        $input = $this->getJsonInput();
        $validator = Validator::make($input)->required('email')->email('email');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $email = strtolower(trim($input['email']));

        $stmt = $this->db->prepare(
            'INSERT INTO newsletter_subscribers (email, status, subscribed_at) VALUES (:email, :status, NOW())
             ON DUPLICATE KEY UPDATE status = :status_update, subscribed_at = NOW()'
        );
        $stmt->execute(['email' => $email, 'status' => 'active', 'status_update' => 'active']);

        Response::jsonSuccess(null, 'Thanks for the subscription. You will receive the latest news and campaigns via email.', 201);
    }

    public function unsubscribe(array $params = []): void
    {
        $input = $this->getJsonInput();
        $email = strtolower(trim($input['email'] ?? ''));

        if ($email === '') {
            Response::jsonError('Email is required.', 422);
        }

        $stmt = $this->db->prepare('UPDATE newsletter_subscribers SET status = :status WHERE email = :email');
        $stmt->execute(['status' => 'unsubscribed', 'email' => $email]);

        Response::jsonSuccess(null, 'Unsubscribed from newsletter.');
    }
}
