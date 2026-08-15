<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class MarketingAdminController extends BaseController
{
    private Mailer $mailer;
    private array $app;

    public function __construct()
    {
        parent::__construct();
        $this->mailer = new Mailer();
        $this->app = require dirname(__DIR__, 2) . '/config/app.php';
    }

    private function requireMaster(): void
    {
        $user = $this->authUser();
        $role = $user['role'] ?? '';
        if (!in_array($role, ['admin', 'super_admin'], true)) {
            Response::jsonError('Master admin access required.', 403);
        }
        SchemaGuard::ensureMarketingCampaigns($this->db);
        SchemaGuard::ensureMarketingOptIn($this->db);
    }

    /**
     * Marketing people lists — only opted-in for promotions.
     * type=users     → signup accounts (customer + staff)
     * type=customers → accounts with ≥1 order
     */
    public function users(array $params = []): void
    {
        $this->requireMaster();
        $type = trim((string) ($this->query('type') ?? 'users'));
        if (!in_array($type, ['users', 'customers'], true)) {
            $type = 'users';
        }

        $search = trim((string) ($this->query('search') ?? ''));
        $page = max(1, (int) ($this->query('page') ?? 1));
        $perPage = min(50, max(1, (int) ($this->query('per_page') ?? 20)));
        $offset = ($page - 1) * $perPage;

        $where = "WHERE u.role IN ('customer', 'staff') AND u.marketing_opt_in = 1";
        $bind = [];

        if ($type === 'customers') {
            $where .= ' AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)';
        }

        if ($search !== '') {
            $where .= ' AND (u.name LIKE :q OR u.email LIKE :q2 OR u.phone LIKE :q3)';
            $like = '%' . $search . '%';
            $bind['q'] = $like;
            $bind['q2'] = $like;
            $bind['q3'] = $like;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users u {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT u.id, u.name, u.email, u.phone, u.status, u.marketing_opt_in, u.created_at,
                    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
                    (SELECT COALESCE(SUM(total), 0) FROM orders o
                     WHERE o.user_id = u.id AND o.payment_status = 'paid') AS total_spent
             FROM users u
             {$where}
             ORDER BY u.created_at DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($bind);

        Response::jsonPaginate($stmt->fetchAll(), $total, $page, $perPage);
    }

    /** Homepage newsletter subscribers. */
    public function subscribers(array $params = []): void
    {
        $this->requireMaster();
        $search = trim((string) ($this->query('search') ?? ''));
        $page = max(1, (int) ($this->query('page') ?? 1));
        $perPage = min(50, max(1, (int) ($this->query('per_page') ?? 20)));
        $offset = ($page - 1) * $perPage;

        $where = "WHERE status = 'active'";
        $bind = [];
        if ($search !== '') {
            $where .= ' AND email LIKE :q';
            $bind['q'] = '%' . $search . '%';
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM newsletter_subscribers {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT id, email, status, subscribed_at
             FROM newsletter_subscribers {$where}
             ORDER BY subscribed_at DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($bind);

        Response::jsonPaginate($stmt->fetchAll(), $total, $page, $perPage);
    }

    /** Lightweight pick lists for promotion targeting (no pagination). */
    public function audience(array $params = []): void
    {
        $this->requireMaster();
        $type = trim((string) ($this->query('type') ?? 'users'));

        if ($type === 'subscribed') {
            $stmt = $this->db->query(
                "SELECT id, email, email AS name, subscribed_at AS created_at
                 FROM newsletter_subscribers
                 WHERE status = 'active'
                 ORDER BY subscribed_at DESC
                 LIMIT 500"
            );
            Response::jsonSuccess($stmt->fetchAll());
            return;
        }

        $where = "u.role IN ('customer', 'staff') AND u.status = 'active' AND u.marketing_opt_in = 1";
        if ($type === 'customers') {
            $where .= ' AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)';
        }

        $stmt = $this->db->query(
            "SELECT u.id, u.name, u.email, u.phone, u.created_at
             FROM users u
             WHERE {$where}
             ORDER BY u.created_at DESC
             LIMIT 500"
        );
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function uploadBanner(array $params = []): void
    {
        $this->requireMaster();
        if (empty($_FILES['image'])) {
            Response::jsonError('No image file uploaded.', 422);
        }

        $uploader = new Uploader();
        $result = $uploader->upload($_FILES['image'], 'marketing');

        if (!($result['success'] ?? false)) {
            Response::jsonError($result['message'] ?? 'Upload failed.', 422);
        }

        $path = '/' . ltrim((string) $result['path'], '/');
        Response::jsonSuccess(['path' => $path, 'url' => $path], 'Banner image uploaded.');
    }

    /** Send one-to-one or bulk promotion emails. */
    public function sendPromotion(array $params = []): void
    {
        $this->requireMaster();
        $input = $this->getJsonInput();

        $heading = trim((string) ($input['heading'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        $bannerPath = trim((string) ($input['banner_image'] ?? ''));
        $productLink = trim((string) ($input['product_link'] ?? ''));
        $actualPrice = trim((string) ($input['actual_price'] ?? ''));
        $offerPrice = trim((string) ($input['offer_price'] ?? ''));
        $audienceType = trim((string) ($input['audience_type'] ?? 'users'));
        $mode = trim((string) ($input['mode'] ?? 'one_to_one'));
        $recipientIds = $input['recipient_ids'] ?? [];

        if ($heading === '') {
            Response::jsonError('Promotion heading is required.', 422);
        }
        if ($bannerPath === '') {
            Response::jsonError('Banner image is required.', 422);
        }
        if (!is_array($recipientIds) || $recipientIds === []) {
            Response::jsonError('Select at least one recipient.', 422);
        }

        $ids = array_values(array_unique(array_map('intval', $recipientIds)));
        $ids = array_values(array_filter($ids, static fn ($id) => $id > 0));
        if ($ids === []) {
            Response::jsonError('Select at least one valid recipient.', 422);
        }

        if ($mode === 'one_to_one' && count($ids) > 25) {
            Response::jsonError('One-to-one mode allows up to 25 selected recipients.', 422);
        }
        if (count($ids) > 200) {
            Response::jsonError('Maximum 200 recipients per send.', 422);
        }

        $emails = $this->resolveEmails($audienceType, $ids);
        if ($emails === []) {
            Response::jsonError('No valid emails found for the selected recipients.', 422);
        }

        $frontendUrl = rtrim((string) ($this->app['frontend_url'] ?? 'http://localhost:5173'), '/');
        $apiUrl = rtrim((string) ($this->app['url'] ?? ''), '/');
        $bannerUrl = $this->absoluteMediaUrl($bannerPath, $apiUrl);
        $ctaUrl = $productLink !== ''
            ? (preg_match('#^https?://#i', $productLink) ? $productLink : $frontendUrl . '/' . ltrim($productLink, '/'))
            : $frontendUrl . '/shop';

        $html = $this->buildPromotionHtml([
            'heading' => $heading,
            'description' => $description,
            'banner_url' => $bannerUrl,
            'cta_url' => $ctaUrl,
            'actual_price' => $actualPrice,
            'offer_price' => $offerPrice,
        ]);

        $subject = $heading;
        $sent = 0;
        $failed = 0;

        foreach ($emails as $email) {
            if ($this->mailer->send($email, $subject, $html)) {
                $sent++;
            } else {
                $failed++;
            }
        }

        $total = count($emails);
        $status = $sent === 0 ? 'failed' : ($failed > 0 ? 'partial' : 'sent');

        $insert = $this->db->prepare(
            "INSERT INTO marketing_campaigns
             (heading, description, banner_image, product_link, actual_price, offer_price,
              mode, audience_type, recipient_count, sent_count, failed_count, status, triggered_by, created_at)
             VALUES
             (:heading, :description, :banner_image, :product_link, :actual_price, :offer_price,
              :mode, :audience_type, :recipient_count, :sent_count, :failed_count, :status, :triggered_by, NOW())"
        );
        $insert->execute([
            'heading' => $heading,
            'description' => $description !== '' ? $description : null,
            'banner_image' => $bannerPath,
            'product_link' => $productLink !== '' ? $productLink : null,
            'actual_price' => $actualPrice !== '' ? $actualPrice : null,
            'offer_price' => $offerPrice !== '' ? $offerPrice : null,
            'mode' => in_array($mode, ['one_to_one', 'bulk'], true) ? $mode : 'one_to_one',
            'audience_type' => in_array($audienceType, ['users', 'customers', 'subscribed'], true)
                ? $audienceType
                : 'users',
            'recipient_count' => $total,
            'sent_count' => $sent,
            'failed_count' => $failed,
            'status' => $status,
            'triggered_by' => $this->authUserId(),
        ]);

        Response::jsonSuccess([
            'id' => (int) $this->db->lastInsertId(),
            'sent' => $sent,
            'failed' => $failed,
            'total' => $total,
            'mode' => $mode,
            'audience_type' => $audienceType,
            'status' => $status,
        ], $sent > 0
            ? "Promotion emailed to {$sent} recipient(s)."
            : 'Could not send promotion emails. Check mail settings.');
    }

    /** List triggered marketing campaigns. */
    public function campaigns(array $params = []): void
    {
        $this->requireMaster();
        $search = trim((string) ($this->query('search') ?? ''));
        $page = max(1, (int) ($this->query('page') ?? 1));
        $perPage = min(50, max(1, (int) ($this->query('per_page') ?? 20)));
        $offset = ($page - 1) * $perPage;

        $where = 'WHERE 1=1';
        $bind = [];
        if ($search !== '') {
            $where .= ' AND (c.heading LIKE :q OR c.audience_type LIKE :q2 OR c.mode LIKE :q3)';
            $like = '%' . $search . '%';
            $bind['q'] = $like;
            $bind['q2'] = $like;
            $bind['q3'] = $like;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM marketing_campaigns c {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT c.id, c.heading, c.description, c.banner_image, c.product_link,
                    c.actual_price, c.offer_price, c.mode, c.audience_type,
                    c.recipient_count, c.sent_count, c.failed_count, c.status,
                    c.triggered_by, c.created_at,
                    u.name AS triggered_by_name
             FROM marketing_campaigns c
             LEFT JOIN users u ON u.id = c.triggered_by
             {$where}
             ORDER BY c.created_at DESC
             LIMIT {$perPage} OFFSET {$offset}"
        );
        $stmt->execute($bind);

        Response::jsonPaginate($stmt->fetchAll(), $total, $page, $perPage);
    }

    /** Email product develop a request to unlock Marketing (Free → Paid). */
    public function featureRequest(array $params = []): void
    {
        $this->requireMaster();
        $input = $this->getJsonInput();

        $name = trim((string) ($input['name'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = trim((string) ($input['phone'] ?? ''));
        $store = trim((string) ($input['store_name'] ?? ''));
        $message = trim((string) ($input['message'] ?? ''));

        if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::jsonError('Valid name and email are required.', 422);
        }

        $admin = $this->authUser();
        $safe = static fn (string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
        $adminName = $safe((string) ($admin['name'] ?? 'Admin'));
        $adminEmail = $safe((string) ($admin['email'] ?? ''));
        $html = <<<HTML
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="letter-spacing:0.12em;text-transform:uppercase;">YULO</h2>
    <p><strong>Marketing feature request</strong></p>
    <p>Someone requested access to unlock Paid Marketing campaigns (one-to-one + bulk).</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#666;">Name</td><td style="padding:6px 0;text-align:right;">{$safe($name)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Email</td><td style="padding:6px 0;text-align:right;">{$safe($email)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Phone</td><td style="padding:6px 0;text-align:right;">{$safe($phone !== '' ? $phone : '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Store</td><td style="padding:6px 0;text-align:right;">{$safe($store !== '' ? $store : '—')}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Admin account</td><td style="padding:6px 0;text-align:right;">{$adminName} ({$adminEmail})</td></tr>
    </table>
    <p style="margin-top:20px;"><strong>Message</strong></p>
    <p style="white-space:pre-wrap;background:#f6f6f6;padding:12px;">{$safe($message !== '' ? $message : '—')}</p>
  </div>
</body>
</html>
HTML;

        $to = (string) ($this->app['staff_licence_dev_email'] ?? 'naveenreddy.webdev@gmail.com');
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $to = 'naveenreddy.webdev@gmail.com';
        }

        $sent = $this->mailer->send(
            $to,
            'YULO Marketing feature request — ' . $name,
            $html,
            true,
            $email
        );
        if (!$sent) {
            Response::jsonError('Could not send request email. Check mail settings.', 502);
        }

        Response::jsonSuccess(['sent_to' => $to], 'Request sent to product develop.');
    }

    /** @param list<int> $ids @return list<string> */
    private function resolveEmails(string $audienceType, array $ids): array
    {
        $placeholders = [];
        $bind = [];
        foreach ($ids as $i => $id) {
            $key = 'id' . $i;
            $placeholders[] = ':' . $key;
            $bind[$key] = $id;
        }
        $in = implode(',', $placeholders);

        if ($audienceType === 'subscribed') {
            $stmt = $this->db->prepare(
                "SELECT email FROM newsletter_subscribers
                 WHERE status = 'active' AND id IN ({$in})"
            );
            $stmt->execute($bind);
        } else {
            $where = "u.role IN ('customer', 'staff') AND u.marketing_opt_in = 1 AND u.id IN ({$in})";
            if ($audienceType === 'customers') {
                $where .= ' AND EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)';
            }
            $stmt = $this->db->prepare(
                "SELECT u.email FROM users u WHERE {$where}"
            );
            $stmt->execute($bind);
        }

        $emails = [];
        foreach ($stmt->fetchAll() as $row) {
            $email = strtolower(trim((string) ($row['email'] ?? '')));
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $emails[$email] = $email;
            }
        }

        return array_values($emails);
    }

    private function absoluteMediaUrl(string $path, string $apiBase): string
    {
        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }
        $origin = preg_replace('#/api/?$#', '', $apiBase) ?: $apiBase;
        return rtrim((string) $origin, '/') . '/' . ltrim($path, '/');
    }

    /** @param array{heading:string,description:string,banner_url:string,cta_url:string,actual_price:string,offer_price:string} $data */
    private function buildPromotionHtml(array $data): string
    {
        $heading = htmlspecialchars($data['heading']);
        $description = nl2br(htmlspecialchars($data['description']));
        $banner = htmlspecialchars($data['banner_url']);
        $cta = htmlspecialchars($data['cta_url']);
        $actual = htmlspecialchars($data['actual_price']);
        $offer = htmlspecialchars($data['offer_price']);

        $priceBlock = '';
        if ($actual !== '' || $offer !== '') {
            $priceBlock = '<p style="margin:16px 0;">';
            if ($actual !== '') {
                $priceBlock .= '<span style="color:#888;text-decoration:line-through;margin-right:10px;">₹'
                    . $actual . '</span>';
            }
            if ($offer !== '') {
                $priceBlock .= '<span style="font-size:20px;font-weight:700;color:#111;">₹'
                    . $offer . '</span>';
            }
            $priceBlock .= '</p>';
        }

        return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111;">'
            . '<h1 style="font-size:22px;margin:0 0 16px;">' . $heading . '</h1>'
            . '<a href="' . $cta . '" style="display:block;margin-bottom:16px;">'
            . '<img src="' . $banner . '" alt="' . $heading . '" style="width:100%;max-width:560px;height:auto;border:0;display:block;" />'
            . '</a>'
            . ($description !== '' ? '<p style="line-height:1.55;margin:0 0 12px;">' . $description . '</p>' : '')
            . $priceBlock
            . '<p style="margin:24px 0;"><a href="' . $cta . '" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 22px;font-weight:600;">Shop now</a></p>'
            . '<p style="font-size:12px;color:#888;">You received this promotion from YULO.</p>'
            . '</div>';
    }

    private function query(string $key): mixed
    {
        return $_GET[$key] ?? null;
    }
}
