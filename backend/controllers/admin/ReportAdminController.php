<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class ReportAdminController extends BaseController
{
    public function sales(array $params = []): void
    {
        [$year, $month, $from, $to, $granularity] = $this->resolvePeriod();

        $summary = $this->salesSummary($from, $to);
        $items = $granularity === 'day'
            ? $this->salesDailySeries($year, $month, $from, $to)
            : $this->salesMonthlySeries($year, $from, $to);

        // Keep a flat list for Dashboard / Revenue consumers that expect rows.
        $legacy = [];
        foreach ($items as $row) {
            $legacy[] = [
                'date' => $row['key'],
                'label' => $row['label'],
                'orders' => $row['orders'],
                'paid_orders' => $row['paid_orders'],
                'revenue' => $row['revenue'],
            ];
        }

        Response::jsonSuccess([
            'year' => $year,
            'month' => $month,
            'granularity' => $granularity,
            'from' => $from,
            'to' => $to,
            'summary' => $summary,
            'items' => $items,
            // Backward-compatible list (also mirrors items for older callers)
            'rows' => $legacy,
            'available_years' => $this->availableYears(),
        ]);
    }

    public function products(array $params = []): void
    {
        [$year, $month, $from, $to, $granularity] = $this->resolvePeriod();

        $stmt = $this->db->prepare(
            "SELECT p.id, p.name, p.sku,
                    COALESCE(SUM(oi.quantity), 0) AS units_sold,
                    COUNT(DISTINCT o.id) AS orders,
                    COALESCE(SUM(oi.total), 0) AS revenue
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             JOIN orders o ON o.id = oi.order_id
             WHERE o.payment_status = 'paid'
               AND o.created_at BETWEEN :from AND :to
             GROUP BY p.id, p.name, p.sku
             ORDER BY units_sold DESC, revenue DESC
             LIMIT 50"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);

        $items = [];
        $units = 0;
        $revenue = 0.0;
        foreach ($stmt->fetchAll() as $row) {
            $u = (int) $row['units_sold'];
            $r = round((float) $row['revenue'], 2);
            $units += $u;
            $revenue += $r;
            $items[] = [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'sku' => $row['sku'],
                'units_sold' => $u,
                'orders' => (int) $row['orders'],
                'revenue' => $r,
            ];
        }

        Response::jsonSuccess([
            'year' => $year,
            'month' => $month,
            'granularity' => $granularity,
            'from' => $from,
            'to' => $to,
            'summary' => [
                'products' => count($items),
                'units_sold' => $units,
                'revenue' => round($revenue, 2),
            ],
            'items' => $items,
            'available_years' => $this->availableYears(),
        ]);
    }

    public function customers(array $params = []): void
    {
        [$year, $month, $from, $to, $granularity] = $this->resolvePeriod();

        $stmt = $this->db->prepare(
            "SELECT u.id, u.name, u.email, u.created_at AS registered_at,
                    COUNT(o.id) AS orders,
                    COALESCE(SUM(o.total), 0) AS total_spent,
                    MAX(o.created_at) AS last_order_at
             FROM users u
             INNER JOIN orders o
               ON o.user_id = u.id
              AND o.payment_status = 'paid'
              AND o.created_at BETWEEN :from AND :to
             WHERE u.role = 'customer'
             GROUP BY u.id, u.name, u.email, u.created_at
             ORDER BY total_spent DESC, orders DESC
             LIMIT 50"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);

        $items = [];
        $orders = 0;
        $spent = 0.0;
        foreach ($stmt->fetchAll() as $row) {
            $o = (int) $row['orders'];
            $t = round((float) $row['total_spent'], 2);
            $orders += $o;
            $spent += $t;
            $items[] = [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'orders' => $o,
                'total_spent' => $t,
                'avg_order_value' => $o > 0 ? round($t / $o, 2) : 0.0,
                'last_order_at' => $row['last_order_at'],
                'registered_at' => $row['registered_at'],
            ];
        }

        $newCustomersStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM users
             WHERE role = 'customer' AND created_at BETWEEN :from AND :to"
        );
        $newCustomersStmt->execute(['from' => $from, 'to' => $to]);
        $newCustomers = (int) $newCustomersStmt->fetchColumn();

        Response::jsonSuccess([
            'year' => $year,
            'month' => $month,
            'granularity' => $granularity,
            'from' => $from,
            'to' => $to,
            'summary' => [
                'customers' => count($items),
                'new_customers' => $newCustomers,
                'orders' => $orders,
                'total_spent' => round($spent, 2),
                'avg_spend' => count($items) > 0 ? round($spent / count($items), 2) : 0.0,
            ],
            'items' => $items,
            'available_years' => $this->availableYears(),
        ]);
    }

    /** @return array{0:int,1:int|string,2:string,3:string,4:string} */
    private function resolvePeriod(): array
    {
        // Prefer explicit from/to when provided (Dashboard / Revenue).
        $fromRaw = trim((string) ($_GET['from'] ?? ''));
        $toRaw = trim((string) ($_GET['to'] ?? ''));
        if ($fromRaw !== '' && $toRaw !== '') {
            $fromDay = preg_match('/^\d{4}-\d{2}-\d{2}/', $fromRaw) ? substr($fromRaw, 0, 10) : date('Y-m-d');
            $toDay = preg_match('/^\d{4}-\d{2}-\d{2}/', $toRaw) ? substr($toRaw, 0, 10) : date('Y-m-d');
            if ($fromDay > $toDay) {
                [$fromDay, $toDay] = [$toDay, $fromDay];
            }
            $from = $fromDay . ' 00:00:00';
            $to = $toDay . ' 23:59:59';
            $year = (int) substr($fromDay, 0, 4);
            $spanDays = (int) ((strtotime($toDay) - strtotime($fromDay)) / 86400) + 1;
            $granularity = $spanDays > 45 ? 'month' : 'day';
            $month = $granularity === 'day' && substr($fromDay, 0, 7) === substr($toDay, 0, 7)
                ? (int) substr($fromDay, 5, 2)
                : 'range';
            return [$year, $month, $from, $to, $granularity];
        }

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

    /** @return array{revenue:float,orders:int,paid_orders:int,avg_order_value:float} */
    private function salesSummary(string $from, string $to): array
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

        $paid = (int) ($row['paid_orders'] ?? 0);
        $revenue = round((float) ($row['revenue'] ?? 0), 2);

        return [
            'revenue' => $revenue,
            'orders' => (int) ($row['orders'] ?? 0),
            'paid_orders' => $paid,
            'avg_order_value' => $paid > 0 ? round($revenue / $paid, 2) : 0.0,
        ];
    }

    /** @param int|string $month */
    private function salesDailySeries(int $year, $month, string $from, string $to): array
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

        // For custom ranges spanning multiple months, walk day-by-day.
        if ($month === 'range' || !is_int($month)) {
            $series = [];
            $cursor = strtotime(substr($from, 0, 10));
            $end = strtotime(substr($to, 0, 10));
            while ($cursor <= $end) {
                $key = date('Y-m-d', $cursor);
                $row = $rows[$key] ?? null;
                $series[] = [
                    'key' => $key,
                    'label' => date('d M', $cursor),
                    'orders' => (int) ($row['orders'] ?? 0),
                    'paid_orders' => (int) ($row['paid_orders'] ?? 0),
                    'revenue' => round((float) ($row['revenue'] ?? 0), 2),
                ];
                $cursor = strtotime('+1 day', $cursor);
            }
            return $series;
        }

        $days = (int) date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
        $series = [];
        for ($d = 1; $d <= $days; $d++) {
            $key = sprintf('%04d-%02d-%02d', $year, $month, $d);
            $row = $rows[$key] ?? null;
            $series[] = [
                'key' => $key,
                'label' => (string) $d,
                'orders' => (int) ($row['orders'] ?? 0),
                'paid_orders' => (int) ($row['paid_orders'] ?? 0),
                'revenue' => round((float) ($row['revenue'] ?? 0), 2),
            ];
        }
        return $series;
    }

    /** @return list<array<string, mixed>> */
    private function salesMonthlySeries(int $year, string $from, string $to): array
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

        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $fromYm = substr($from, 0, 7);
        $toYm = substr($to, 0, 7);

        // Full calendar year when month=all; otherwise only months in custom range.
        if ($fromYm === sprintf('%04d-01', $year) && $toYm === sprintf('%04d-12', $year)) {
            $series = [];
            for ($m = 1; $m <= 12; $m++) {
                $key = sprintf('%04d-%02d', $year, $m);
                $row = $rows[$key] ?? null;
                $series[] = [
                    'key' => $key,
                    'label' => $monthNames[$m - 1],
                    'orders' => (int) ($row['orders'] ?? 0),
                    'paid_orders' => (int) ($row['paid_orders'] ?? 0),
                    'revenue' => round((float) ($row['revenue'] ?? 0), 2),
                ];
            }
            return $series;
        }

        $series = [];
        $cursor = strtotime($fromYm . '-01');
        $end = strtotime($toYm . '-01');
        while ($cursor <= $end) {
            $key = date('Y-m', $cursor);
            $row = $rows[$key] ?? null;
            $series[] = [
                'key' => $key,
                'label' => date('M Y', $cursor),
                'orders' => (int) ($row['orders'] ?? 0),
                'paid_orders' => (int) ($row['paid_orders'] ?? 0),
                'revenue' => round((float) ($row['revenue'] ?? 0), 2),
            ];
            $cursor = strtotime('+1 month', $cursor);
        }
        return $series;
    }

    /** @return list<int> */
    private function availableYears(): array
    {
        $min = (int) $this->db->query(
            'SELECT COALESCE(MIN(YEAR(created_at)), YEAR(CURDATE())) FROM orders'
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
}
