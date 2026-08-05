import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import useDebounce from '../../hooks/useDebounce';
import { productService } from '../../services/productService';

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useContext(UIContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const debounced = useDebounce(query);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debounced) { setResults([]); return; }
    productService.searchProducts(debounced).then((res) => {
      setResults(res.data?.data ?? []);
    }).catch(() => setResults([]));
  }, [debounced]);

  if (!searchOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    closeSearch();
    navigate(`/shop?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center pt-5" style={{ zIndex: 1060, background: 'rgba(0,0,0,0.85)' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <button className="btn btn-link text-white position-absolute top-0 end-0 m-4" onClick={closeSearch}>
          <i className="bi bi-x-lg fs-4" />
        </button>
        <form onSubmit={handleSubmit}>
          <input
            type="search"
            className="form-control form-control-lg bg-transparent text-white border-0 border-bottom rounded-0"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{ fontSize: '1.5rem' }}
          />
        </form>
        {results.length > 0 && (
          <div className="mt-4">
            {results.slice(0, 6).map((p) => (
              <button
                key={p.id}
                className="d-block w-100 text-start text-white py-2 border-0 bg-transparent"
                onClick={() => { closeSearch(); navigate(`/product/${p.slug}`); }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
