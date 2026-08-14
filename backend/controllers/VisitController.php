<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class VisitController extends BaseController
{
    public function track(array $params = []): void
    {
        SchemaGuard::ensureVisitorPageViews($this->db);

        $input = $this->getJsonInput();
        $path = trim((string) ($input['path'] ?? ''));
        $visitorId = trim((string) ($input['visitor_id'] ?? ''));
        $sessionId = trim((string) ($input['session_id'] ?? ''));

        if ($path === '' || $visitorId === '' || $sessionId === '') {
            Response::jsonError('path, visitor_id and session_id are required.', 422);
        }

        if (strlen($path) > 500) {
            $path = substr($path, 0, 500);
        }
        if (strlen($visitorId) > 36) {
            $visitorId = substr($visitorId, 0, 36);
        }
        if (strlen($sessionId) > 36) {
            $sessionId = substr($sessionId, 0, 36);
        }

        $title = trim((string) ($input['title'] ?? ''));
        if (strlen($title) > 255) {
            $title = substr($title, 0, 255);
        }

        $referrer = trim((string) ($input['referrer'] ?? ''));
        if (strlen($referrer) > 500) {
            $referrer = substr($referrer, 0, 500);
        }

        $ua = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);
        $device = $this->detectDevice($ua);
        $ip = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '');
        if (str_contains($ip, ',')) {
            $ip = trim(explode(',', $ip)[0]);
        }
        $ipHash = $ip !== '' ? hash('sha256', $ip) : null;

        $userId = null;
        $auth = $this->authUser();
        if ($auth && isset($auth['id'])) {
            $userId = (int) $auth['id'];
        } elseif (!empty($input['user_id'])) {
            $userId = (int) $input['user_id'];
            if ($userId <= 0) {
                $userId = null;
            }
        }

        $stmt = $this->db->prepare(
            'INSERT INTO visitor_page_views
                (visitor_id, session_id, user_id, path, title, referrer, device_type, user_agent, ip_hash, created_at)
             VALUES
                (:visitor_id, :session_id, :user_id, :path, :title, :referrer, :device_type, :user_agent, :ip_hash, NOW())'
        );
        $stmt->execute([
            'visitor_id' => $visitorId,
            'session_id' => $sessionId,
            'user_id' => $userId,
            'path' => $path,
            'title' => $title !== '' ? $title : null,
            'referrer' => $referrer !== '' ? $referrer : null,
            'device_type' => $device,
            'user_agent' => $ua !== '' ? $ua : null,
            'ip_hash' => $ipHash,
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Tracked.', 201);
    }

    private function detectDevice(string $ua): string
    {
        $uaLower = strtolower($ua);
        if ($uaLower === '') {
            return 'desktop';
        }
        if (preg_match('/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i', $ua)) {
            return 'tablet';
        }
        if (preg_match('/mobi|iphone|ipod|android.*mobile|windows phone|opera mini/i', $uaLower)) {
            return 'mobile';
        }
        return 'desktop';
    }
}
