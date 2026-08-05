<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class WalletController extends BaseController
{
    public function show(array $params = []): void
    {
        $userId = $this->authUserId();
        $wallet = $this->getOrCreateWallet($userId);

        $stmt = $this->db->prepare(
            'SELECT * FROM wallet_transactions WHERE wallet_id = :wallet_id ORDER BY created_at DESC LIMIT 20'
        );
        $stmt->execute(['wallet_id' => $wallet['id']]);

        Response::jsonSuccess([
            'balance' => (float) $wallet['balance'],
            'transactions' => $stmt->fetchAll(),
        ]);
    }

    public function transactions(array $params = []): void
    {
        $userId = $this->authUserId();
        $wallet = $this->getOrCreateWallet($userId);
        $pagination = Pagination::resolve();

        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM wallet_transactions WHERE wallet_id = :wallet_id');
        $countStmt->execute(['wallet_id' => $wallet['id']]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT * FROM wallet_transactions WHERE wallet_id = :wallet_id ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':wallet_id', $wallet['id'], PDO::PARAM_INT);
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    private function getOrCreateWallet(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM wallets WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $wallet = $stmt->fetch();

        if ($wallet) {
            return $wallet;
        }

        $insert = $this->db->prepare('INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES (:user_id, 0, NOW(), NOW())');
        $insert->execute(['user_id' => $userId]);

        return ['id' => (int) $this->db->lastInsertId(), 'user_id' => $userId, 'balance' => 0];
    }
}
