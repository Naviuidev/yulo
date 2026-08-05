<?php

declare(strict_types=1);

abstract class BaseController
{
    protected PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    protected function authUser(): ?array
    {
        return $GLOBALS['auth_user'] ?? null;
    }

    protected function authUserId(): ?int
    {
        $user = $this->authUser();
        return $user ? (int) $user['id'] : null;
    }

    protected function getJsonInput(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $data = json_decode($raw, true);

        return is_array($data) ? $data : [];
    }

    protected function getInput(): array
    {
        $json = $this->getJsonInput();
        $merged = array_merge($_POST, $_GET, $json);
        return Security::sanitizeArray($merged);
    }
}
