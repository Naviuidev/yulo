<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class DashboardController extends BaseController
{
    public function index(array $params = []): void
    {
        $stats = [];

        $stats['total_orders'] = (int) $this->db->query('SELECT COUNT(*) FROM orders')->fetchColumn();
        $stats['total_revenue'] = (float) $this->db->query("SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'paid'")->fetchColumn();
        $stats['total_customers'] = (int) $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
        $stats['total_products'] = (int) $this->db->query("SELECT COUNT(*) FROM products WHERE status = 'active'")->fetchColumn();
        $stats['pending_orders'] = (int) $this->db->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();
        $stats['low_stock'] = (int) $this->db->query('SELECT COUNT(*) FROM products WHERE stock <= 5 AND status = "active"')->fetchColumn();

        $recentOrders = $this->db->query(
            'SELECT o.id, o.order_number, o.total, o.status, o.created_at, u.name as customer_name
             FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 10'
        )->fetchAll();

        $monthlyRevenue = $this->db->query(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total) as revenue
             FROM orders WHERE payment_status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY month ORDER BY month ASC"
        )->fetchAll();

        Response::jsonSuccess([
            'stats' => $stats,
            'recent_orders' => $recentOrders,
            'monthly_revenue' => $monthlyRevenue,
        ]);
    }
}
