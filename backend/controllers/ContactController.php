<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class ContactController extends BaseController
{
    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input)
            ->required('name')
            ->required('email')
            ->email('email')
            ->required('subject')
            ->required('message');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $stmt = $this->db->prepare(
            'INSERT INTO contact_messages (name, email, phone, subject, message, status, created_at)
             VALUES (:name, :email, :phone, :subject, :message, :status, NOW())'
        );
        $stmt->execute([
            'name' => $input['name'],
            'email' => $input['email'],
            'phone' => $input['phone'] ?? null,
            'subject' => $input['subject'],
            'message' => $input['message'],
            'status' => 'new',
        ]);

        $mailer = new Mailer();
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $mailer->send(
            $appConfig['mail']['from_address'],
            'New Contact: ' . $input['subject'],
            "<p>From: {$input['name']} ({$input['email']})</p><p>{$input['message']}</p>"
        );

        Response::jsonSuccess(null, 'Message sent successfully.', 201);
    }
}
