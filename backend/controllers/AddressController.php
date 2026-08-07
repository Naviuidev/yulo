<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class AddressController extends BaseController
{
    public function index(array $params = []): void
    {
        $userId = $this->authUserId();
        $stmt = $this->db->prepare('SELECT * FROM addresses WHERE user_id = :user_id ORDER BY is_default DESC, created_at DESC');
        $stmt->execute(['user_id' => $userId]);
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        $input = $this->normalizeAddressInput($this->getJsonInput());
        $userId = $this->authUserId();

        $validator = Validator::make($input)
            ->required('name')
            ->required('phone')
            ->phone('phone')
            ->required('address_line1')
            ->required('city')
            ->required('state')
            ->required('pincode');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        if (!empty($input['is_default'])) {
            $this->db->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = :user_id')->execute(['user_id' => $userId]);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, state, pincode, country, type, is_default, created_at, updated_at)
             VALUES (:user_id, :name, :phone, :address_line1, :address_line2, :city, :state, :pincode, :country, :type, :is_default, NOW(), NOW())'
        );
        $stmt->execute([
            'user_id' => $userId,
            'name' => $input['name'],
            'phone' => $input['phone'],
            'address_line1' => $input['address_line1'],
            'address_line2' => $input['address_line2'] ?? null,
            'city' => $input['city'],
            'state' => $input['state'],
            'pincode' => $input['pincode'],
            'country' => $input['country'] ?? 'India',
            'type' => $input['type'] ?? 'shipping',
            'is_default' => !empty($input['is_default']) ? 1 : 0,
        ]);

        $id = (int) $this->db->lastInsertId();
        $row = $this->db->prepare('SELECT * FROM addresses WHERE id = :id LIMIT 1');
        $row->execute(['id' => $id]);

        Response::jsonSuccess($row->fetch(), 'Address added.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->normalizeAddressInput($this->getJsonInput());
        $userId = $this->authUserId();
        $id = (int) ($params['id'] ?? 0);

        if ($id < 1) {
            Response::jsonError('Address not found.', 404);
        }

        if (!empty($input['is_default'])) {
            $this->db->prepare('UPDATE addresses SET is_default = 0 WHERE user_id = :user_id')->execute(['user_id' => $userId]);
        }

        $stmt = $this->db->prepare(
            'UPDATE addresses SET name = :name, phone = :phone, address_line1 = :address_line1, address_line2 = :address_line2,
             city = :city, state = :state, pincode = :pincode, country = :country, type = :type, is_default = :is_default, updated_at = NOW()
             WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute([
            'name' => $input['name'] ?? '',
            'phone' => $input['phone'] ?? '',
            'address_line1' => $input['address_line1'] ?? '',
            'address_line2' => $input['address_line2'] ?? null,
            'city' => $input['city'] ?? '',
            'state' => $input['state'] ?? '',
            'pincode' => $input['pincode'] ?? '',
            'country' => $input['country'] ?? 'India',
            'type' => $input['type'] ?? 'shipping',
            'is_default' => !empty($input['is_default']) ? 1 : 0,
            'id' => $id,
            'user_id' => $userId,
        ]);

        if ($stmt->rowCount() === 0) {
            Response::jsonError('Address not found.', 404);
        }

        Response::jsonSuccess(null, 'Address updated.');
    }

    private function normalizeAddressInput(array $input): array
    {
        if (empty($input['name']) && !empty($input['full_name'])) {
            $input['name'] = $input['full_name'];
        }

        if (!empty($input['phone'])) {
            $digits = preg_replace('/\D+/', '', (string) $input['phone']) ?? '';
            if (str_starts_with($digits, '91') && strlen($digits) > 10) {
                $digits = substr($digits, 2);
            }
            $digits = ltrim($digits, '0');
            $input['phone'] = substr($digits, -10);
        }

        return $input;
    }

    public function destroy(array $params): void
    {
        $userId = $this->authUserId();
        $stmt = $this->db->prepare('DELETE FROM addresses WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $params['id'], 'user_id' => $userId]);

        if ($stmt->rowCount() === 0) {
            Response::jsonError('Address not found.', 404);
        }

        Response::jsonSuccess(null, 'Address deleted.');
    }
}
