<?php

declare(strict_types=1);

final class RateLimitMiddleware
{
    public function handle(): bool
    {
        $ip = Security::getClientIp();
        $key = 'rate:' . $ip . ':' . ($_SERVER['REQUEST_URI'] ?? '/');

        if (!Security::checkRateLimit($key)) {
            Response::jsonError('Too many requests. Please try again later.', 429);
            return false;
        }

        return true;
    }
}
