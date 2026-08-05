<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class InventoryAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $lowStock = isset($_GET['low_stock']);

        $where = 'p.status != "archived"';
        if ($lowStock) {
            $where .= ' AND p.stock <= 5';
        }

        $countStmt = $this->db->query("SELECT COUNT(*) FROM products p WHERE {$where}");
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT p.id, p.name, p.sku, p.stock, p.status, c.name as category_name
             FROM products p LEFT JOIN categories c ON c.id = p.category_id
             WHERE {$where} ORDER BY p.stock ASC LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function adjust(array $params = []): void
    {
        $input = $this->getJsonInput();

        if (empty($input['product_id']) || !isset($input['quantity'])) {
            Response::jsonError('Product ID and quantity are required.', 422);
        }

        $type = $input['type'] ?? 'adjustment';
        $quantity = (int) $input['quantity'];

        $stmt = $this->db->prepare('UPDATE products SET stock = stock + :quantity, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['quantity' => $quantity, 'id' => $input['product_id']]);

        $log = $this->db->prepare(
            'INSERT INTO inventory_logs (product_id, variant_id, quantity, type, notes, created_at)
             VALUES (:product_id, :variant_id, :quantity, :type, :notes, NOW())'
        );
        $log->execute([
            'product_id' => $input['product_id'],
            'variant_id' => $input['variant_id'] ?? null,
            'quantity' => $quantity,
            'type' => $type,
            'notes' => $input['notes'] ?? null,
        ]);

        Response::jsonSuccess(null, 'Inventory adjusted.');
    }

    public function logs(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $total = (int) $this->db->query('SELECT COUNT(*) FROM inventory_logs')->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT il.*, p.name as product_name FROM inventory_logs il
             JOIN products p ON p.id = il.product_id
             ORDER BY il.created_at DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }
}
