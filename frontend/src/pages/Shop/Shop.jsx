import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import ProductCard from '../../components/ui/ProductCard';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { productService, categoryService, brandService } from '../../services/productService';
import { SORT_OPTIONS, SIZES, COLORS, MOCK_PRODUCTS } from '../../utils/constants';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = {
    category_id: searchParams.get('category_id') || '',
    brand_id: searchParams.get('brand_id') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'newest',
    size: searchParams.get('size') || '',
    color: searchParams.get('color') || '',
    rating: searchParams.get('rating') || '',
    page: searchParams.get('page') || '1',
    featured: searchParams.get('featured') || '',
    section: searchParams.get('section') || '',
  };

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, per_page: 12 };
      if (params.featured) params.featured = '1';
      const res = await productService.getProducts(params);
      let items = res.data?.data ?? MOCK_PRODUCTS;

      if (filters.size) items = items.filter(() => true);
      if (filters.color) items = items.filter(() => true);
      if (filters.rating) items = items.filter((p) => (p.average_rating ?? 0) >= Number(filters.rating));

      setProducts(items);
      setPagination(res.data?.pagination ?? { page: 1, total_pages: 1 });
    } catch {
      setProducts(MOCK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    categoryService.getCategories().then((r) => setCategories(r.data?.data ?? []));
    brandService.getBrands().then((r) => setBrands(r.data?.data ?? []));
  }, []);

  const clearFilters = () => setSearchParams({});

  return (
    <>
      <SEO title="Shop" description="Browse YULO premium fashion collection." />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Shop' }]} />
          <h1>Shop</h1>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-3">
            <button className="btn btn-dark d-lg-none w-100 mb-3" onClick={() => setFiltersOpen(!filtersOpen)}>
              <i className="bi bi-funnel me-2" /> Filters
            </button>
            <aside className={`shop-filters ${filtersOpen ? 'd-block' : 'd-none d-lg-block'}`}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 text-uppercase small fw-semibold">Filters</h5>
                <button className="btn btn-link btn-sm p-0" onClick={clearFilters}>Clear</button>
              </div>

              <div className="filter-group">
                <h6>Category</h6>
                {categories.map((c) => (
                  <div key={c.id} className="form-check">
                    <input type="radio" className="form-check-input" id={`cat-${c.id}`} checked={filters.category_id === String(c.id)} onChange={() => updateFilter('category_id', String(c.id))} />
                    <label className="form-check-label small" htmlFor={`cat-${c.id}`}>{c.name}</label>
                  </div>
                ))}
              </div>

              <div className="filter-group">
                <h6>Brand</h6>
                {brands.map((b) => (
                  <div key={b.id} className="form-check">
                    <input type="radio" className="form-check-input" id={`brand-${b.id}`} checked={filters.brand_id === String(b.id)} onChange={() => updateFilter('brand_id', String(b.id))} />
                    <label className="form-check-label small" htmlFor={`brand-${b.id}`}>{b.name}</label>
                  </div>
                ))}
              </div>

              <div className="filter-group">
                <h6>Price Range</h6>
                <div className="row g-2">
                  <div className="col-6">
                    <input type="number" className="form-control form-control-sm" placeholder="Min" value={filters.min_price} onChange={(e) => updateFilter('min_price', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <input type="number" className="form-control form-control-sm" placeholder="Max" value={filters.max_price} onChange={(e) => updateFilter('max_price', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="filter-group">
                <h6>Size</h6>
                <div className="d-flex flex-wrap gap-1">
                  {SIZES.map((s) => (
                    <button key={s} className={`size-option ${filters.size === s ? 'active' : ''}`} style={{ minWidth: 36, height: 36, fontSize: '0.75rem' }} onClick={() => updateFilter('size', filters.size === s ? '' : s)}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <h6>Color</h6>
                <div className="d-flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c.name} className={`color-swatch ${filters.color === c.name ? 'active' : ''}`} style={{ background: c.hex, width: 24, height: 24 }} onClick={() => updateFilter('color', filters.color === c.name ? '' : c.name)} title={c.name} />
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <h6>Rating</h6>
                {[4, 3, 2].map((r) => (
                  <div key={r} className="form-check">
                    <input type="radio" className="form-check-input" id={`rating-${r}`} checked={filters.rating === String(r)} onChange={() => updateFilter('rating', String(r))} />
                    <label className="form-check-label small" htmlFor={`rating-${r}`}>{r}+ Stars</label>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="col-lg-9">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="text-muted small">{products.length} products</span>
              <select className="form-select form-select-sm w-auto" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <Loader fullScreen />
            ) : products.length === 0 ? (
              <EmptyState icon="bi-search" title="No products found" message="Try adjusting your filters." actionLabel="Clear Filters" onAction={clearFilters} />
            ) : (
              <>
                <div className="row g-4">
                  {products.map((p, i) => (
                    <div key={p.id} className="col-6 col-md-4">
                      <ProductCard product={p} index={i} />
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={Number(filters.page)}
                  totalPages={pagination.total_pages ?? 1}
                  onPageChange={(p) => updateFilter('page', String(p))}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
