import { useContext, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import PriceDisplay from '../../components/ui/PriceDisplay';
import RatingStars from '../../components/ui/RatingStars';
import Button from '../../components/ui/Button';
import AiSuggestModal from '../../components/compare/AiSuggestModal';
import { CompareContext } from '../../context/CompareContext';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import { getProductImage } from '../../utils/helpers';

function normalizeProducts(items) {
  return items.map((i) => {
    if (i.product) {
      return {
        ...i.product,
        id: i.product.id ?? i.product_id,
        compare_id: i.compare_id ?? i.id,
        stock: i.product.stock ?? i.stock,
        average_rating: Number(i.product.average_rating ?? i.average_rating ?? 0),
        review_count: Number(i.product.review_count ?? i.review_count ?? 0),
      };
    }
    return {
      ...i,
      id: i.product_id ?? i.id,
      compare_id: i.compare_id ?? i.id,
      stock: i.stock,
      average_rating: Number(i.average_rating ?? 0),
      review_count: Number(i.review_count ?? 0),
      primary_image: i.primary_image ?? i.image,
    };
  });
}

function pickBestByRating(products) {
  if (!products.length) return null;
  return [...products].sort((a, b) => {
    const r = Number(b.average_rating || 0) - Number(a.average_rating || 0);
    if (r !== 0) return r;
    const reviews = Number(b.review_count || 0) - Number(a.review_count || 0);
    if (reviews !== 0) return reviews;
    const priceA = Number(a.sale_price > 0 ? a.sale_price : a.price) || 0;
    const priceB = Number(b.sale_price > 0 ? b.sale_price : b.price) || 0;
    return priceA - priceB;
  })[0];
}

export default function Compare() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { items, removeFromCompare, clearCompare, maxItems } = useContext(CompareContext);
  const [showSuggest, setShowSuggest] = useState(false);
  const [buying, setBuying] = useState(false);

  const products = useMemo(() => normalizeProducts(items), [items]);
  const suggestion = useMemo(() => pickBestByRating(products), [products]);

  const openSuggest = () => {
    if (products.length < 2) {
      return;
    }
    setShowSuggest(true);
  };

  const closeSuggest = useCallback(() => setShowSuggest(false), []);

  const handleBuyNow = async () => {
    if (!suggestion) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/compare' } } });
      return;
    }
    setBuying(true);
    try {
      const ok = await addToCart(suggestion, { quantity: 1, silent: true });
      if (ok) {
        setShowSuggest(false);
        navigate('/checkout');
      }
    } finally {
      setBuying(false);
    }
  };

  const rows = [
    {
      key: 'price',
      label: 'Price',
      render: (p) => <PriceDisplay price={p.price} salePrice={p.sale_price} />,
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (p) => (
        <div className="d-flex flex-column align-items-center gap-1">
          <RatingStars rating={p.average_rating ?? 0} />
          <span className="small text-muted">{Number(p.average_rating || 0).toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (p) => {
        const stock = Number(p.stock ?? 0);
        return (
          <span className={stock > 0 ? 'text-dark' : 'text-danger'}>
            {stock > 0 ? `${stock} available` : 'Out of stock'}
          </span>
        );
      },
    },
    {
      key: 'brand',
      label: 'Brand',
      render: (p) => p.brand_name || '—',
    },
    {
      key: 'category',
      label: 'Category',
      render: (p) => p.category_name || '—',
    },
  ];

  return (
    <>
      <SEO title="Compare Products" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Compare' }]} />
          <h1>Compare Products</h1>
        </div>
      </div>

      <div className="container py-5">
        {products.length === 0 ? (
          <EmptyState
            icon="bi-arrow-left-right"
            title="Nothing to compare"
            message={`Add up to ${maxItems} products to compare side by side.`}
            actionLabel="Browse Shop"
            actionTo="/shop"
          />
        ) : (
          <>
            <div className="yulo-compare__toolbar">
              <p className="yulo-compare__count mb-0">
                Comparing <strong>{products.length}</strong> of {maxItems} products
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  onClick={openSuggest}
                  disabled={products.length < 2}
                  title={products.length < 2 ? 'Add at least 2 products to get a suggestion' : 'AI Suggest'}
                >
                  <i className="bi bi-stars me-1" />
                  AI Suggest
                </button>
                <Button variant="outline" onClick={clearCompare}>Clear All</Button>
              </div>
            </div>

            <div className="yulo-compare">
              <div
                className="yulo-compare__grid"
                style={{ '--compare-cols': products.length }}
              >
                <div className="yulo-compare__label-col">
                  <div className="yulo-compare__corner">Product</div>
                  {rows.map((row) => (
                    <div key={row.key} className="yulo-compare__row-label">
                      {row.label}
                    </div>
                  ))}
                  <div className="yulo-compare__row-label">Action</div>
                </div>

                {products.map((p) => (
                  <div key={p.id} className="yulo-compare__col">
                    <div className="yulo-compare__product">
                      <button
                        type="button"
                        className="yulo-compare__remove"
                        onClick={() => removeFromCompare(p.compare_id ?? p.id)}
                        aria-label={`Remove ${p.name}`}
                      >
                        <i className="bi bi-x-lg" />
                      </button>
                      <Link to={`/product/${p.slug}`} className="yulo-compare__media">
                        <img src={getProductImage(p)} alt={p.name} />
                      </Link>
                      <Link to={`/product/${p.slug}`} className="yulo-compare__name text-decoration-none">
                        {p.name}
                      </Link>
                    </div>
                    {rows.map((row) => (
                      <div key={`${p.id}-${row.key}`} className="yulo-compare__cell">
                        {row.render(p)}
                      </div>
                    ))}
                    <div className="yulo-compare__cell">
                      <Link to={`/product/${p.slug}`} className="btn btn-sm btn-dark w-100">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <AiSuggestModal
        open={showSuggest}
        product={suggestion}
        comparedCount={products.length}
        buying={buying}
        onClose={closeSuggest}
        onBuyNow={handleBuyNow}
      />
    </>
  );
}
