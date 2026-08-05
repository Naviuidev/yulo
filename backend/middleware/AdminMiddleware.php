<?php

declare(strict_types=1);

final class AdminMiddleware
{
    public function handle(): bool
    {
        $auth = new AuthMiddleware();
        if (!$auth->handle()) {
            return false;
        }

        $user = $GLOBALS['auth_user'] ?? null;

        if (!$user || !in_array($user['role'] ?? '', ['admin', 'super_admin'], true)) {
            Response::jsonError('Admin access required.', 403);
            return false;
        }

        return true;
    }
}
