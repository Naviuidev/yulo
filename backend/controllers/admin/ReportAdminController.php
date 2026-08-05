<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class ReportAdminController extends BaseController
{
    public function sales(array $params = []): void
    {
        $from = $_GET['from'] ?? date('Y-m-01');
        $to = $_GET['to'] ?? date('Y-m-d');

        $stmt = $this->db->prepare(
            "SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total) as revenue
             FROM orders WHERE payment_status = 'paid' AND DATE(created_at) BETWEEN :from AND :to
             GROUP BY DATE(created_at) ORDER BY date ASC"
        );
        $stmt->execute(['from' => $from, 'to' => $to]);

        Response::jsonSuccess($stmt->fetchAll());
    }

    public function products(array $params = []): void
    {
        $stmt = $this->db->query(
            'SELECT p.id, p.name, p.sku, SUM(oi.quantity) as units_sold, SUM(oi.total) as revenue
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             JOIN orders o ON o.id = oi.order_id
             WHERE o.payment_status = "paid"
             GROUP BY p.id ORDER BY units_sold DESC LIMIT 20'
        );

        Response::jsonSuccess($stmt->fetchAll());
    }

    public function customers(array $params = []): void
    {
        $stmt = $this->db->query(
            "SELECT u.id, u.name, u.email, COUNT(o.id) as orders, COALESCE(SUM(o.total), 0) as total_spent
             FROM users u
             LEFT JOIN orders o ON o.user_id = u.id AND o.payment_status = 'paid'
             WHERE u.role = 'customer'
             GROUP BY u.id ORDER BY total_spent DESC LIMIT 20"
        );

        Response::jsonSuccess($stmt->fetchAll());
    }
}
