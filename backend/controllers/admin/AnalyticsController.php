<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class AnalyticsController extends BaseController
{
    public function overview(array $params = []): void
    {
        $period = $_GET['period'] ?? '30';

        $revenue = $this->db->prepare(
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)"
        );
        $revenue->execute(['days' => (int) $period]);
        $totalRevenue = (float) $revenue->fetchColumn();

        $orders = $this->db->prepare(
            'SELECT COUNT(*) FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)'
        );
        $orders->execute(['days' => (int) $period]);
        $totalOrders = (int) $orders->fetchColumn();

        $newCustomers = $this->db->prepare(
            "SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)"
        );
        $newCustomers->execute(['days' => (int) $period]);
        $totalNewCustomers = (int) $newCustomers->fetchColumn();

        $conversionRate = $totalOrders > 0 ? round(($totalOrders / max($totalNewCustomers, 1)) * 100, 2) : 0;

        $topCategories = $this->db->query(
            'SELECT c.name, SUM(oi.total) as revenue
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             JOIN categories c ON c.id = p.category_id
             JOIN orders o ON o.id = oi.order_id
             WHERE o.payment_status = "paid"
             GROUP BY c.id ORDER BY revenue DESC LIMIT 5'
        )->fetchAll();

        Response::jsonSuccess([
            'period_days' => (int) $period,
            'revenue' => $totalRevenue,
            'orders' => $totalOrders,
            'new_customers' => $totalNewCustomers,
            'avg_order_value' => $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0,
            'conversion_rate' => $conversionRate,
            'top_categories' => $topCategories,
        ]);
    }

    public function traffic(array $params = []): void
    {
        Response::jsonSuccess([
            'message' => 'Integrate with analytics provider (Google Analytics, etc.)',
            'placeholder' => true,
        ]);
    }
}
