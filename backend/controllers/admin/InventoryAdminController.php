<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class InventoryAdminController extends BaseController
{
    private const DEFAULT_LOW_STOCK_THRESHOLD = 5;

    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $filter = trim((string) ($_GET['filter'] ?? ''));
        $q = trim((string) ($_GET['q'] ?? $_GET['search'] ?? ''));
        $status = trim((string) ($_GET['status'] ?? ''));
        $lowStock = isset($_GET['low_stock']) || $filter === 'low';

        $where = ['p.status != "archived"'];
        $bind = [];

        if ($lowStock || $filter === 'low') {
            $where[] = 'p.stock > 0 AND p.stock <= COALESCE(NULLIF(p.low_stock_threshold, 0), ' . self::DEFAULT_LOW_STOCK_THRESHOLD . ')';
        } elseif ($filter === 'out') {
            $where[] = 'p.stock <= 0';
        } elseif ($filter === 'ok') {
            $where[] = 'p.stock > COALESCE(NULLIF(p.low_stock_threshold, 0), ' . self::DEFAULT_LOW_STOCK_THRESHOLD . ')';
        }

        if ($status !== '' && in_array($status, ['active', 'inactive'], true)) {
            $where[] = 'p.status = :status';
            $bind['status'] = $status;
        }

        if ($q !== '') {
            $where[] = '(p.name LIKE :q OR p.sku LIKE :q)';
            $bind['q'] = '%' . $q . '%';
        }

        $whereSql = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM products p WHERE {$whereSql}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT p.id, p.name, p.sku, p.stock, p.status, p.price, p.sale_price, p.updated_at,
                    COALESCE(NULLIF(p.low_stock_threshold, 0), " . self::DEFAULT_LOW_STOCK_THRESHOLD . ") AS low_stock_threshold,
                    c.name AS category_name,
                    b.name AS brand_name,
                    (SELECT pi.image_path FROM product_images pi
                     WHERE pi.product_id = p.id
                     ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
                     LIMIT 1) AS primary_image,
                    COALESCE((
                        SELECT SUM(oi.quantity)
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE oi.product_id = p.id AND o.payment_status = 'paid'
                    ), 0) AS units_sold,
                    COALESCE((
                        SELECT SUM(oi.total)
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE oi.product_id = p.id AND o.payment_status = 'paid'
                    ), 0) AS sold_revenue,
                    (SELECT MAX(il.created_at) FROM inventory_logs il WHERE il.product_id = p.id) AS last_adjusted_at
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             WHERE {$whereSql}
             ORDER BY
                CASE
                    WHEN p.stock <= 0 THEN 0
                    WHEN p.stock <= COALESCE(NULLIF(p.low_stock_threshold, 0), " . self::DEFAULT_LOW_STOCK_THRESHOLD . ") THEN 1
                    ELSE 2
                END ASC,
                p.stock ASC,
                p.name ASC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        $items = [];
        foreach ($stmt->fetchAll() as $row) {
            $items[] = $this->formatListRow($row);
        }

        Response::jsonPaginate($items, $total, $pagination['page'], $pagination['per_page'], 'Success', [
            'summary' => $this->summary(),
            'low_stock_threshold' => self::DEFAULT_LOW_STOCK_THRESHOLD,
        ]);
    }

    public function show(array $params): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            Response::jsonError('Product not found.', 404);
        }

        $stmt = $this->db->prepare(
            "SELECT p.id, p.name, p.sku, p.stock, p.status, p.price, p.sale_price, p.updated_at, p.created_at,
                    COALESCE(NULLIF(p.low_stock_threshold, 0), " . self::DEFAULT_LOW_STOCK_THRESHOLD . ") AS low_stock_threshold,
                    c.name AS category_name,
                    b.name AS brand_name,
                    (SELECT pi.image_path FROM product_images pi
                     WHERE pi.product_id = p.id
                     ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
                     LIMIT 1) AS primary_image
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             WHERE p.id = :id
             LIMIT 1"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::jsonError('Product not found.', 404);
        }

        $soldStmt = $this->db->prepare(
            "SELECT
                COALESCE(SUM(oi.quantity), 0) AS units_sold,
                COALESCE(SUM(oi.total), 0) AS sold_revenue,
                COUNT(DISTINCT o.id) AS paid_orders
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.product_id = :id AND o.payment_status = 'paid'"
        );
        $soldStmt->execute(['id' => $id]);
        $sold = $soldStmt->fetch() ?: [];

        $pendingStmt = $this->db->prepare(
            "SELECT COALESCE(SUM(oi.quantity), 0)
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.product_id = :id
               AND o.payment_status != 'paid'
               AND o.status NOT IN ('cancelled', 'refunded')"
        );
        $pendingStmt->execute(['id' => $id]);
        $pendingUnits = (int) $pendingStmt->fetchColumn();

        $logsStmt = $this->db->prepare(
            'SELECT id, quantity, type, notes, created_at, variant_id
             FROM inventory_logs
             WHERE product_id = :id
             ORDER BY created_at DESC, id DESC
             LIMIT 40'
        );
        $logsStmt->execute(['id' => $id]);
        $logs = [];
        foreach ($logsStmt->fetchAll() as $log) {
            $logs[] = [
                'id' => (int) $log['id'],
                'quantity' => (int) $log['quantity'],
                'type' => $log['type'],
                'notes' => $log['notes'],
                'created_at' => $log['created_at'],
                'variant_id' => $log['variant_id'] !== null ? (int) $log['variant_id'] : null,
            ];
        }

        $stock = (int) $row['stock'];
        $threshold = (int) $row['low_stock_threshold'];
        Response::jsonSuccess([
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'sku' => $row['sku'],
            'stock' => $stock,
            'status' => $row['status'],
            'price' => round((float) $row['price'], 2),
            'sale_price' => $row['sale_price'] !== null ? round((float) $row['sale_price'], 2) : null,
            'category_name' => $row['category_name'],
            'brand_name' => $row['brand_name'],
            'primary_image' => $row['primary_image'],
            'updated_at' => $row['updated_at'],
            'created_at' => $row['created_at'],
            'stock_status' => $this->stockStatus($stock, $threshold),
            'low_stock_threshold' => $threshold,
            'units_sold' => (int) ($sold['units_sold'] ?? 0),
            'sold_revenue' => round((float) ($sold['sold_revenue'] ?? 0), 2),
            'paid_orders' => (int) ($sold['paid_orders'] ?? 0),
            'pending_units' => $pendingUnits,
            'logs' => $logs,
        ]);
    }

    public function adjust(array $params = []): void
    {
        $input = $this->getJsonInput();

        $productId = (int) ($input['product_id'] ?? 0);
        if ($productId <= 0 || !isset($input['quantity'])) {
            Response::jsonError('Product ID and quantity are required.', 422);
        }

        $quantity = (int) $input['quantity'];
        if ($quantity === 0) {
            Response::jsonError('Quantity cannot be zero.', 422);
        }

        $type = (string) ($input['type'] ?? 'adjustment');
        if (!in_array($type, ['adjustment', 'restock', 'sale', 'return'], true)) {
            $type = 'adjustment';
        }

        // Convenience: restock/return default to positive, sale to negative if admin enters absolute units.
        if (($type === 'restock' || $type === 'return') && $quantity < 0) {
            $quantity = abs($quantity);
        }
        if ($type === 'sale' && $quantity > 0) {
            $quantity = -abs($quantity);
        }

        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare('SELECT id, name, stock FROM products WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => $productId]);
            $product = $stmt->fetch();
            if (!$product) {
                $this->db->rollBack();
                Response::jsonError('Product not found.', 404);
            }

            $current = (int) $product['stock'];
            $newStock = $current + $quantity;
            if ($newStock < 0) {
                $this->db->rollBack();
                Response::jsonError(
                    "Insufficient stock. Current: {$current}. Adjustment would result in {$newStock}.",
                    422
                );
            }

            $upd = $this->db->prepare(
                'UPDATE products SET stock = :stock, updated_at = NOW() WHERE id = :id'
            );
            $upd->execute(['stock' => $newStock, 'id' => $productId]);

            $log = $this->db->prepare(
                'INSERT INTO inventory_logs (product_id, variant_id, quantity, type, notes, created_at)
                 VALUES (:product_id, :variant_id, :quantity, :type, :notes, NOW())'
            );
            $log->execute([
                'product_id' => $productId,
                'variant_id' => !empty($input['variant_id']) ? (int) $input['variant_id'] : null,
                'quantity' => $quantity,
                'type' => $type,
                'notes' => isset($input['notes']) ? trim((string) $input['notes']) : null,
            ]);

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }

        Response::jsonSuccess([
            'product_id' => $productId,
            'previous_stock' => $current,
            'quantity' => $quantity,
            'stock' => $newStock,
            'stock_status' => $this->stockStatus($newStock),
        ], 'Inventory adjusted.');
    }

    public function logs(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $productId = (int) ($_GET['product_id'] ?? 0);

        $where = '1=1';
        $bind = [];
        if ($productId > 0) {
            $where = 'il.product_id = :product_id';
            $bind['product_id'] = $productId;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM inventory_logs il WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT il.*, p.name AS product_name, p.sku
             FROM inventory_logs il
             JOIN products p ON p.id = il.product_id
             WHERE {$where}
             ORDER BY il.created_at DESC, il.id DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    /** @return array<string, int> */
    private function summary(): array
    {
        $thr = self::DEFAULT_LOW_STOCK_THRESHOLD;
        $row = $this->db->query(
            "SELECT
                COUNT(*) AS total_products,
                COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock,
                COALESCE(SUM(CASE WHEN stock > 0 AND stock <= COALESCE(NULLIF(low_stock_threshold, 0), {$thr}) THEN 1 ELSE 0 END), 0) AS low_stock,
                COALESCE(SUM(CASE WHEN stock > COALESCE(NULLIF(low_stock_threshold, 0), {$thr}) THEN 1 ELSE 0 END), 0) AS in_stock,
                COALESCE(SUM(GREATEST(stock, 0)), 0) AS total_units
             FROM products
             WHERE status != 'archived'"
        )->fetch() ?: [];

        return [
            'total_products' => (int) ($row['total_products'] ?? 0),
            'out_of_stock' => (int) ($row['out_of_stock'] ?? 0),
            'low_stock' => (int) ($row['low_stock'] ?? 0),
            'in_stock' => (int) ($row['in_stock'] ?? 0),
            'total_units' => (int) ($row['total_units'] ?? 0),
        ];
    }

    /** @param array<string, mixed> $row */
    private function formatListRow(array $row): array
    {
        $stock = (int) $row['stock'];
        $threshold = (int) ($row['low_stock_threshold'] ?? self::DEFAULT_LOW_STOCK_THRESHOLD);
        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'sku' => $row['sku'],
            'stock' => $stock,
            'status' => $row['status'],
            'price' => round((float) $row['price'], 2),
            'sale_price' => $row['sale_price'] !== null ? round((float) $row['sale_price'], 2) : null,
            'category_name' => $row['category_name'],
            'brand_name' => $row['brand_name'],
            'primary_image' => $row['primary_image'],
            'updated_at' => $row['updated_at'],
            'units_sold' => (int) $row['units_sold'],
            'sold_revenue' => round((float) $row['sold_revenue'], 2),
            'last_adjusted_at' => $row['last_adjusted_at'],
            'low_stock_threshold' => $threshold,
            'stock_status' => $this->stockStatus($stock, $threshold),
        ];
    }

    private function stockStatus(int $stock, ?int $threshold = null): string
    {
        $limit = $threshold ?? self::DEFAULT_LOW_STOCK_THRESHOLD;
        if ($stock <= 0) {
            return 'out';
        }
        if ($stock <= $limit) {
            return 'low';
        }
        return 'ok';
    }
}
