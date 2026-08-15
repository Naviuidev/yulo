<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class ProfileController extends BaseController
{
    public function show(array $params = []): void
    {
        $userId = $this->authUserId();
        $userModel = new User($this->db);
        $user = $userModel->findById($userId);

        $orderCount = $this->db->prepare('SELECT COUNT(*) FROM orders WHERE user_id = :user_id');
        $orderCount->execute(['user_id' => $userId]);

        $walletStmt = $this->db->prepare('SELECT balance FROM wallets WHERE user_id = :user_id LIMIT 1');
        $walletStmt->execute(['user_id' => $userId]);
        $wallet = $walletStmt->fetch();

        Response::jsonSuccess([
            'user' => $user,
            'stats' => [
                'orders' => (int) $orderCount->fetchColumn(),
                'wallet_balance' => (float) ($wallet['balance'] ?? 0),
            ],
        ]);
    }

    public function update(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        $data = [];
        if (isset($input['name'])) {
            $data['name'] = $input['name'];
        }
        if (isset($input['phone'])) {
            $data['phone'] = $input['phone'];
        }
        if (array_key_exists('marketing_opt_in', $input)) {
            $data['marketing_opt_in'] = !empty($input['marketing_opt_in']) ? 1 : 0;
        }

        if (!empty($input['password'])) {
            $validator = Validator::make($input)->required('current_password')->min('password', 8)->confirmed('password');
            if ($validator->fails()) {
                Response::jsonError('Validation failed.', 422, $validator->errors());
            }

            $stmt = $this->db->prepare('SELECT password FROM users WHERE id = :id');
            $stmt->execute(['id' => $userId]);
            $user = $stmt->fetch();

            if (!$user || !Security::verifyPassword($input['current_password'], $user['password'])) {
                Response::jsonError('Current password is incorrect.', 422);
            }

            $data['password'] = Security::hashPassword($input['password']);
        }

        if (empty($data)) {
            Response::jsonError('No data to update.', 422);
        }

        $userModel = new User($this->db);
        $userModel->update($userId, $data);

        Response::jsonSuccess($userModel->findById($userId), 'Profile updated.');
    }
}
