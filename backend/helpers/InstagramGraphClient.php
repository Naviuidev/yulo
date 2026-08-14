<?php

declare(strict_types=1);

/**
 * Fetches Instagram media via Meta Graph API.
 * Supports both:
 * - Instagram Login tokens (IGAA…) → graph.instagram.com
 * - Facebook/Page tokens (EAA…) → graph.facebook.com
 */
final class InstagramGraphClient
{
    private const FB_GRAPH = 'https://graph.facebook.com/v21.0';
    private const IG_GRAPH = 'https://graph.instagram.com/v21.0';

    /**
     * @return array{ok:bool,items?:list<array<string,mixed>>,error?:string,raw_count?:int,host?:string}
     */
    public function fetchMedia(string $igUserId, string $accessToken, int $limit = 12): array
    {
        $igUserId = trim($igUserId);
        $accessToken = $this->normalizeToken($accessToken);
        $limit = max(1, min(24, $limit));

        if ($igUserId === '' || $accessToken === '') {
            return ['ok' => false, 'error' => 'Instagram User ID and Access token are required.'];
        }

        if (str_contains($accessToken, '•') || strtolower($accessToken) === 'null') {
            return ['ok' => false, 'error' => 'Access token looks invalid. Paste a fresh token from Meta (not the masked •••• value).'];
        }

        $hosts = $this->hostsForToken($accessToken);
        $lastError = 'Instagram API request failed.';

        foreach ($hosts as $host) {
            $url = $host . '/' . rawurlencode($igUserId) . '/media?' . http_build_query([
                'fields' => 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp',
                'limit' => $limit,
                'access_token' => $accessToken,
            ]);

            $response = $this->request($url);
            if (!$response['ok']) {
                $lastError = $response['error'] ?? $lastError;
                // If user id wrong for this host, try me/media for Instagram Login tokens
                if ($this->isInstagramToken($accessToken)) {
                    $meUrl = $host . '/me/media?' . http_build_query([
                        'fields' => 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp',
                        'limit' => $limit,
                        'access_token' => $accessToken,
                    ]);
                    $meResponse = $this->request($meUrl);
                    if ($meResponse['ok']) {
                        return $this->mapMediaResponse($meResponse['data'] ?? [], $host);
                    }
                    $lastError = $meResponse['error'] ?? $lastError;
                }
                continue;
            }

            return $this->mapMediaResponse($response['data'] ?? [], $host);
        }

        return ['ok' => false, 'error' => $lastError];
    }

    public function normalizeToken(string $token): string
    {
        $token = trim($token);
        // Undo accidental HTML encoding from pasted/sanitized values
        $token = html_entity_decode($token, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $token = preg_replace('/\s+/', '', $token) ?? $token;
        return $token;
    }

    private function isInstagramToken(string $token): bool
    {
        return str_starts_with($token, 'IGAA') || str_starts_with($token, 'IGAAR');
    }

    /** @return list<string> */
    private function hostsForToken(string $token): array
    {
        if ($this->isInstagramToken($token)) {
            return [self::IG_GRAPH, self::FB_GRAPH];
        }
        return [self::FB_GRAPH, self::IG_GRAPH];
    }

    /**
     * @param array<string,mixed> $data
     * @return array{ok:bool,items?:list<array<string,mixed>>,error?:string,raw_count?:int,host?:string}
     */
    private function mapMediaResponse(array $data, string $host): array
    {
        $rows = is_array($data['data'] ?? null) ? $data['data'] : [];
        $items = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $type = strtoupper((string) ($row['media_type'] ?? 'IMAGE'));
            $image = '';
            if ($type === 'VIDEO') {
                $image = trim((string) ($row['thumbnail_url'] ?? $row['media_url'] ?? ''));
            } else {
                $image = trim((string) ($row['media_url'] ?? $row['thumbnail_url'] ?? ''));
            }
            if ($image === '') {
                continue;
            }

            $items[] = [
                'id' => 'ig-' . (string) ($row['id'] ?? substr(bin2hex(random_bytes(4)), 0, 8)),
                'image_url' => $image,
                'permalink' => trim((string) ($row['permalink'] ?? '')) ?: null,
                'caption' => trim((string) ($row['caption'] ?? '')),
                'product_id' => null,
                'product_name' => '',
                'product_slug' => '',
                'media_type' => $type,
                'source' => 'api',
            ];
        }

        if (!$items) {
            $apiError = isset($data['error']['message']) ? (string) $data['error']['message'] : '';
            return [
                'ok' => false,
                'error' => $apiError !== ''
                    ? $apiError
                    : 'No media returned. Check Instagram User ID, token permissions, and that the account has posts.',
                'raw_count' => count($rows),
                'host' => $host,
            ];
        }

        return ['ok' => true, 'items' => $items, 'raw_count' => count($rows), 'host' => $host];
    }

    /**
     * @return array{ok:bool,data?:array<string,mixed>,error?:string,status?:int}
     */
    private function request(string $url): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 25,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return ['ok' => false, 'error' => $curlError !== '' ? $curlError : 'cURL request failed.', 'status' => $status];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['ok' => false, 'error' => 'Invalid response from Instagram API.', 'status' => $status];
        }

        if ($status >= 400 || isset($decoded['error'])) {
            $message = (string) ($decoded['error']['message'] ?? 'Instagram API error.');
            $code = $decoded['error']['code'] ?? null;
            if ($code) {
                $message .= ' (code ' . $code . ')';
            }
            return ['ok' => false, 'error' => $message, 'status' => $status, 'data' => $decoded];
        }

        return ['ok' => true, 'data' => $decoded, 'status' => $status];
    }
}
