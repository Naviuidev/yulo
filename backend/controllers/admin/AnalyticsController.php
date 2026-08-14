<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class AnalyticsController extends BaseController
{
    public function overview(array $params = []): void
    {
        [$year, $month, $from, $to, $granularity] = $this->resolvePeriod();

        $summary = $this->periodSummary($from, $to);
        $series = $granularity === 'day'
            ? $this->dailySeries($year, (int) $month, $from, $to)
            : $this->monthlySeries($year, $from, $to);

        $topCategories = $this->topCategories($from, $to);
        $years = $this->availableYears();

        Response::jsonSuccess([
            'year' => $year,
            'month' => $month,
            'granularity' => $granularity,
            'from' => $from,
            'to' => $to,
            'revenue' => $summary['revenue'],
            'orders' => $summary['orders'],
            'paid_orders' => $summary['paid_orders'],
            'new_customers' => $summary['new_customers'],
            'avg_order_value' => $summary['avg_order_value'],
            'series' => $series,
            'top_categories' => $topCategories,
            'available_years' => $years,
        ]);
    }

    public function traffic(array $params = []): void
    {
        SchemaGuard::ensureVisitorPageViews($this->db);

        [$year, $month, $from, $to, $granularity] = $this->resolvePeriod();
        $summary = $this->trafficSummary($from, $to);
        $series = $granularity === 'day'
            ? $this->trafficDailySeries($year, (int) $month, $from, $to)
            : $this->trafficMonthlySeries($year, $from, $to);

        Response::jsonSuccess([
            'year' => $year,
            'month' => $month,
            'granularity' => $granularity,
            'from' => $from,
            'to' => $to,
            'page_views' => $summary['page_views'],
            'unique_visitors' => $summary['unique_visitors'],
            'sessions' => $summary['sessions'],
            'avg_session_seconds' => $summary['avg_session_seconds'],
            'avg_session_label' => $this->formatDuration($summary['avg_session_seconds']),
            'bounce_rate' => $summary['bounce_rate'],
            'pages_per_session' => $summary['pages_per_session'],
            'live_visitors' => $this->liveVisitors(),
            'series' => $series,
            'top_pages' => $this->topPages($from, $to),
            'devices' => $this->deviceBreakdown($from, $to),
            'top_referrers' => $this->topReferrers($from, $to),
            'recent' => $this->recentVisits(20),
            'available_years' => $this->trafficAvailableYears(),
            'placeholder' => false,
        ]);
    }

    /** @return array{page_views:int,unique_visitors:int,sessions:int,avg_session_seconds:int,bounce_rate:float,pages_per_session:float} */
    private function trafficSummary(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            'SELECT
                COUNT(*) AS page_views,
                COUNT(DISTINCT visitor_id) AS unique_visitors,
                COUNT(DISTINCT session_id) AS sessions
             FROM visitor_page_views
             WHERE created_at BETWEEN :from AND :to'
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $row = $stmt->fetch() ?: [];

        $pageViews = (int) ($row['page_views'] ?? 0);
        $sessions = (int) ($row['sessions'] ?? 0);

        $avgStmt = $this->db->prepare(
            'SELECT AVG(duration_sec) FROM (
                SELECT TIMESTAMPDIFF(SECOND, MIN(created_at), MAX(created_at)) AS duration_sec
                FROM visitor_page_views
                WHERE created_at BETWEEN :from AND :to
                GROUP BY session_id
             ) t'
        );
        $avgStmt->execute(['from' => $from, 'to' => $to]);
        $avgSeconds = (int) round((float) ($avgStmt->fetchColumn() ?: 0));

        $bounceStmt = $this->db->prepare(
            'SELECT
                COALESCE(SUM(CASE WHEN cnt = 1 THEN 1 ELSE 0 END), 0) AS bounced,
                COUNT(*) AS total
             FROM (
                SELECT session_id, COUNT(*) AS cnt
                FROM visitor_page_views
                WHERE created_at BETWEEN :from AND :to
                GROUP BY session_id
             ) s'
        );
        $bounceStmt->execute(['from' => $from, 'to' => $to]);
        $bounce = $bounceStmt->fetch() ?: [];
        $totalSessions = (int) ($bounce['total'] ?? 0);
        $bounced = (int) ($bounce['bounced'] ?? 0);
        $bounceRate = $totalSessions > 0 ? round(($bounced / $totalSessions) * 100, 1) : 0.0;

        return [
            'page_views' => $pageViews,
            'unique_visitors' => (int) ($row['unique_visitors'] ?? 0),
            'sessions' => $sessions,
            'avg_session_seconds' => $avgSeconds,
            'bounce_rate' => $bounceRate,
            'pages_per_session' => $sessions > 0 ? round($pageViews / $sessions, 2) : 0.0,
        ];
    }

    private function liveVisitors(): int
    {
        $stmt = $this->db->query(
            "SELECT COUNT(DISTINCT session_id)
             FROM visitor_page_views
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)"
        );
        return (int) $stmt->fetchColumn();
    }

    /** @return list<array<string, mixed>> */
    private function trafficDailySeries(int $year, int $month, string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE(created_at) AS bucket,
                    COUNT(*) AS page_views,
                    COUNT(DISTINCT visitor_id) AS unique_visitors,
                    COUNT(DISTINCT session_id) AS sessions
             FROM visitor_page_views
             WHERE created_at BETWEEN :from AND :to
             GROUP BY DATE(created_at)
             ORDER BY bucket ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[(string) $row['bucket']] = $row;
        }

        $days = (int) date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
        $series = [];
        for ($d = 1; $d <= $days; $d++) {
            $key = sprintf('%04d-%02d-%02d', $year, $month, $d);
            $row = $rows[$key] ?? null;
            $series[] = [
                'key' => $key,
                'label' => (string) $d,
                'page_views' => (int) ($row['page_views'] ?? 0),
                'unique_visitors' => (int) ($row['unique_visitors'] ?? 0),
                'sessions' => (int) ($row['sessions'] ?? 0),
            ];
        }
        return $series;
    }

    /** @return list<array<string, mixed>> */
    private function trafficMonthlySeries(int $year, string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS bucket,
                    COUNT(*) AS page_views,
                    COUNT(DISTINCT visitor_id) AS unique_visitors,
                    COUNT(DISTINCT session_id) AS sessions
             FROM visitor_page_views
             WHERE created_at BETWEEN :from AND :to
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY bucket ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[(string) $row['bucket']] = $row;
        }

        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $series = [];
        for ($m = 1; $m <= 12; $m++) {
            $key = sprintf('%04d-%02d', $year, $m);
            $row = $rows[$key] ?? null;
            $series[] = [
                'key' => $key,
                'label' => $monthNames[$m - 1],
                'page_views' => (int) ($row['page_views'] ?? 0),
                'unique_visitors' => (int) ($row['unique_visitors'] ?? 0),
                'sessions' => (int) ($row['sessions'] ?? 0),
            ];
        }
        return $series;
    }

    /** @return list<array<string, mixed>> */
    private function topPages(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            'SELECT path,
                    COUNT(*) AS views,
                    COUNT(DISTINCT visitor_id) AS visitors
             FROM visitor_page_views
             WHERE created_at BETWEEN :from AND :to
             GROUP BY path
             ORDER BY views DESC
             LIMIT 10'
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[] = [
                'path' => $row['path'],
                'views' => (int) $row['views'],
                'visitors' => (int) $row['visitors'],
            ];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function deviceBreakdown(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            'SELECT device_type, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
             FROM visitor_page_views
             WHERE created_at BETWEEN :from AND :to
             GROUP BY device_type
             ORDER BY views DESC'
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[] = [
                'device' => $row['device_type'],
                'views' => (int) $row['views'],
                'visitors' => (int) $row['visitors'],
            ];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function topReferrers(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            'SELECT
                CASE
                    WHEN referrer IS NULL OR referrer = \'\' THEN \'Direct / none\'
                    ELSE SUBSTRING_INDEX(REPLACE(REPLACE(referrer, \'https://\', \'\'), \'http://\', \'\'), \'/\', 1)
                END AS source,
                COUNT(*) AS views,
                COUNT(DISTINCT visitor_id) AS visitors
             FROM visitor_page_views
             WHERE created_at BETWEEN :from AND :to
             GROUP BY source
             ORDER BY views DESC
             LIMIT 8'
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[] = [
                'source' => $row['source'],
                'views' => (int) $row['views'],
                'visitors' => (int) $row['visitors'],
            ];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function recentVisits(int $limit = 20): array
    {
        $stmt = $this->db->prepare(
            'SELECT path, device_type, referrer, visitor_id, session_id, created_at
             FROM visitor_page_views
             ORDER BY created_at DESC
             LIMIT :lim'
        );
        $stmt->bindValue('lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[] = [
                'path' => $row['path'],
                'device' => $row['device_type'],
                'referrer' => $row['referrer'] ?: 'Direct',
                'visitor_id' => substr((string) $row['visitor_id'], 0, 8),
                'created_at' => $row['created_at'],
            ];
        }
        return $out;
    }

    /** @return list<int> */
    private function trafficAvailableYears(): array
    {
        $min = (int) $this->db->query(
            'SELECT COALESCE(MIN(YEAR(created_at)), YEAR(CURDATE())) FROM visitor_page_views'
        )->fetchColumn();
        $max = (int) date('Y');
        if ($min <= 0 || $min > $max) {
            $min = $max;
        }
        $years = [];
        for ($y = $max; $y >= $min; $y--) {
            $years[] = $y;
        }
        return $years;
    }

    private function formatDuration(int $seconds): string
    {
        if ($seconds <= 0) {
            return '0s';
        }
        $m = intdiv($seconds, 60);
        $s = $seconds % 60;
        if ($m <= 0) {
            return $s . 's';
        }
        return $m . 'm ' . $s . 's';
    }

    /** @return array{0:int,1:int|string,2:string,3:string,4:string} */
    private function resolvePeriod(): array
    {
        $year = (int) ($_GET['year'] ?? date('Y'));
        if ($year < 2000 || $year > 2100) {
            $year = (int) date('Y');
        }

        $monthRaw = $_GET['month'] ?? 'all';
        if ($monthRaw === 'all' || $monthRaw === '' || $monthRaw === null) {
            return [
                $year,
                'all',
                sprintf('%04d-01-01 00:00:00', $year),
                sprintf('%04d-12-31 23:59:59', $year),
                'month',
            ];
        }

        $month = (int) $monthRaw;
        if ($month < 1 || $month > 12) {
            $month = (int) date('n');
        }

        $from = sprintf('%04d-%02d-01 00:00:00', $year, $month);
        $lastDay = (int) date('t', strtotime($from));
        $to = sprintf('%04d-%02d-%02d 23:59:59', $year, $month, $lastDay);

        return [$year, $month, $from, $to, 'day'];
    }

    /** @return array{revenue:float,orders:int,paid_orders:int,new_customers:int,avg_order_value:float} */
    private function periodSummary(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_orders,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS revenue
             FROM orders
             WHERE created_at BETWEEN :from AND :to"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $row = $stmt->fetch() ?: [];

        $orders = (int) ($row['orders'] ?? 0);
        $paidOrders = (int) ($row['paid_orders'] ?? 0);
        $revenue = round((float) ($row['revenue'] ?? 0), 2);

        $cust = $this->db->prepare(
            "SELECT COUNT(*) FROM users
             WHERE role = 'customer' AND created_at BETWEEN :from AND :to"
        );
        $cust->execute(['from' => $from, 'to' => $to]);
        $newCustomers = (int) $cust->fetchColumn();

        return [
            'revenue' => $revenue,
            'orders' => $orders,
            'paid_orders' => $paidOrders,
            'new_customers' => $newCustomers,
            'avg_order_value' => $paidOrders > 0 ? round($revenue / $paidOrders, 2) : 0.0,
        ];
    }

    /** @return list<array<string, mixed>> */
    private function dailySeries(int $year, int $month, string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE(created_at) AS bucket,
                    COUNT(*) AS orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS revenue
             FROM orders
             WHERE created_at BETWEEN :from AND :to
             GROUP BY DATE(created_at)
             ORDER BY bucket ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[(string) $row['bucket']] = $row;
        }

        $custStmt = $this->db->prepare(
            "SELECT DATE(created_at) AS bucket, COUNT(*) AS customers
             FROM users
             WHERE role = 'customer' AND created_at BETWEEN :from AND :to
             GROUP BY DATE(created_at)"
        );
        $custStmt->execute(['from' => $from, 'to' => $to]);
        $customers = [];
        foreach ($custStmt->fetchAll() as $row) {
            $customers[(string) $row['bucket']] = (int) $row['customers'];
        }

        $days = (int) date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
        $series = [];
        for ($d = 1; $d <= $days; $d++) {
            $key = sprintf('%04d-%02d-%02d', $year, $month, $d);
            $row = $rows[$key] ?? null;
            $series[] = [
                'key' => $key,
                'label' => (string) $d,
                'revenue' => round((float) ($row['revenue'] ?? 0), 2),
                'orders' => (int) ($row['orders'] ?? 0),
                'paid_orders' => (int) ($row['paid_orders'] ?? 0),
                'customers' => $customers[$key] ?? 0,
            ];
        }

        return $series;
    }

    /** @return list<array<string, mixed>> */
    private function monthlySeries(int $year, string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS bucket,
                    COUNT(*) AS orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) AS revenue
             FROM orders
             WHERE created_at BETWEEN :from AND :to
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY bucket ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[(string) $row['bucket']] = $row;
        }

        $custStmt = $this->db->prepare(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS bucket, COUNT(*) AS customers
             FROM users
             WHERE role = 'customer' AND created_at BETWEEN :from AND :to
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')"
        );
        $custStmt->execute(['from' => $from, 'to' => $to]);
        $customers = [];
        foreach ($custStmt->fetchAll() as $row) {
            $customers[(string) $row['bucket']] = (int) $row['customers'];
        }

        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $series = [];
        for ($m = 1; $m <= 12; $m++) {
            $key = sprintf('%04d-%02d', $year, $m);
            $row = $rows[$key] ?? null;
            $series[] = [
                'key' => $key,
                'label' => $monthNames[$m - 1],
                'revenue' => round((float) ($row['revenue'] ?? 0), 2),
                'orders' => (int) ($row['orders'] ?? 0),
                'paid_orders' => (int) ($row['paid_orders'] ?? 0),
                'customers' => $customers[$key] ?? 0,
            ];
        }

        return $series;
    }

    /** @return list<array<string, mixed>> */
    private function topCategories(string $from, string $to): array
    {
        $stmt = $this->db->prepare(
            "SELECT c.name,
                    COALESCE(SUM(oi.total), 0) AS revenue,
                    COUNT(DISTINCT o.id) AS orders
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             JOIN categories c ON c.id = p.category_id
             JOIN orders o ON o.id = oi.order_id
             WHERE o.payment_status = 'paid'
               AND o.created_at BETWEEN :from AND :to
             GROUP BY c.id, c.name
             ORDER BY revenue DESC
             LIMIT 8"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[] = [
                'name' => $row['name'],
                'revenue' => round((float) $row['revenue'], 2),
                'orders' => (int) $row['orders'],
            ];
        }
        return $out;
    }

    /** @return list<int> */
    private function availableYears(): array
    {
        $min = (int) $this->db->query(
            'SELECT COALESCE(MIN(y), YEAR(CURDATE())) FROM (
                SELECT YEAR(created_at) AS y FROM orders
                UNION ALL
                SELECT YEAR(created_at) AS y FROM users WHERE role = \'customer\'
             ) t'
        )->fetchColumn();
        $max = (int) date('Y');
        if ($min > $max) {
            $min = $max;
        }

        $years = [];
        for ($y = $max; $y >= $min; $y--) {
            $years[] = $y;
        }
        return $years;
    }
}
