<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class CategoryController extends BaseController
{
    private Category $categoryModel;

    public function __construct()
    {
        parent::__construct();
        $this->categoryModel = new Category($this->db);
    }

    public function index(array $params = []): void
    {
        $categories = $this->categoryModel->allActive();
        Response::jsonSuccess($this->buildTree($categories));
    }

    public function show(array $params): void
    {
        $category = $this->categoryModel->findBySlug($params['slug']);

        if (!$category) {
            Response::jsonError('Category not found.', 404);
        }

        $pagination = Pagination::resolve();
        $productModel = new Product($this->db);
        $result = $productModel->list(['category_id' => $category['id']], $pagination['limit'], $pagination['offset']);

        Response::jsonSuccess([
            'category' => $category,
            'products' => $result['items'],
            'pagination' => Pagination::buildMeta($result['total'], $pagination['page'], $pagination['per_page']),
        ]);
    }

    private function buildTree(array $categories, ?int $parentId = null): array
    {
        $tree = [];

        foreach ($categories as $category) {
            if ((int) ($category['parent_id'] ?? 0) === (int) ($parentId ?? 0)) {
                $category['children'] = $this->buildTree($categories, (int) $category['id']);
                $tree[] = $category;
            }
        }

        return $tree;
    }
}
