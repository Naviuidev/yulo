import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UIContext } from '../../context/UIContext';
import useDebounce from '../../hooks/useDebounce';
import { productService } from '../../services/productService';
import { getProductImage } from '../../utils/helpers';
import PriceDisplay from '../ui/PriceDisplay';

const PREVIEW_LIMIT = 8;

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useContext(UIContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query.trim(), 350);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);

    const onKey = (e) => {
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      setTotal(0);
      setLoading(false);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    if (!debounced) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    productService
      .searchProducts(debounced, { per_page: PREVIEW_LIMIT })
      .then((res) => {
        if (cancelled) return;
        const items = Array.isArray(res.data?.data) ? res.data.data : [];
        setResults(items);
        setTotal(Number(res.data?.pagination?.total ?? items.length));
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, searchOpen]);

  if (!searchOpen) return null;

  const goToShop = (q = query.trim()) => {
    closeSearch();
    if (q) navigate(`/shop?search=${encodeURIComponent(q)}`);
    else navigate('/shop');
  };

  const goToProduct = (slug) => {
    closeSearch();
    navigate(`/product/${slug}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goToShop();
  };

  const showEmpty = debounced && !loading && results.length === 0;
  const showHint = !debounced && !loading;

  return (
    <div
      className="yulo-search"
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <button
        type="button"
        className="yulo-search__backdrop"
        aria-label="Close search"
        onClick={closeSearch}
      />

      <div className="yulo-search__panel">
        <div className="yulo-search__top">
          <form className="yulo-search__form" onSubmit={handleSubmit} role="search">
            <i className="bi bi-search yulo-search__icon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              className="yulo-search__input"
              placeholder="Search products, brands…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
              aria-label="Search"
            />
            {query ? (
              <button
                type="button"
                className="yulo-search__clear"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <i className="bi bi-x-lg" />
              </button>
            ) : null}
          </form>
          <button type="button" className="yulo-search__close" onClick={closeSearch} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="yulo-search__body">
          {loading ? (
            <p className="yulo-search__status">Searching…</p>
          ) : null}

          {showHint ? (
            <p className="yulo-search__status">Type a name, brand, or SKU to find pieces.</p>
          ) : null}

          {showEmpty ? (
            <div className="yulo-search__empty">
              <p className="yulo-search__status mb-3">No matches for “{debounced}”.</p>
              <button type="button" className="btn btn-dark btn-sm rounded-0 px-4" onClick={() => goToShop(debounced)}>
                Browse shop
              </button>
            </div>
          ) : null}

          {results.length > 0 ? (
            <>
              <div className="yulo-search__meta">
                <span>
                  {total} result{total === 1 ? '' : 's'}
                  {debounced ? ` for “${debounced}”` : ''}
                </span>
              </div>
              <ul className="yulo-search__list">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="yulo-search__item"
                      onClick={() => goToProduct(p.slug)}
                    >
                      <span className="yulo-search__thumb">
                        <img src={getProductImage(p)} alt="" loading="lazy" />
                      </span>
                      <span className="yulo-search__info">
                        <span className="yulo-search__name">{p.name}</span>
                        {(p.brand_name || p.category_name) && (
                          <span className="yulo-search__sub">
                            {[p.brand_name, p.category_name].filter(Boolean).join(' · ')}
                          </span>
                        )}
                        <PriceDisplay price={p.price} salePrice={p.sale_price} size="sm" />
                      </span>
                      <i className="bi bi-chevron-right yulo-search__chevron" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="yulo-search__view-all"
                onClick={() => goToShop(debounced)}
              >
                View all results
                <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
