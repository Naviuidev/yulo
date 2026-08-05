import { useContext } from 'react';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import PriceDisplay from '../../components/ui/PriceDisplay';
import RatingStars from '../../components/ui/RatingStars';
import Button from '../../components/ui/Button';
import { CompareContext } from '../../context/CompareContext';
import { getProductImage } from '../../utils/helpers';
import { Link } from 'react-router-dom';

export default function Compare() {
  const { items, removeFromCompare, clearCompare, maxItems } = useContext(CompareContext);

  const products = items.map((i) => i.product ?? i);

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
          <EmptyState icon="bi-arrow-left-right" title="Nothing to compare" message={`Add up to ${maxItems} products to compare.`} actionLabel="Browse Shop" actionTo="/shop" />
        ) : (
          <>
            <div className="d-flex justify-content-end mb-3">
              <Button variant="outline" onClick={clearCompare}>Clear All</Button>
            </div>
            <div className="table-responsive">
              <table className="table">
                <tbody>
                  <tr>
                    <th className="text-uppercase small">Product</th>
                    {products.map((p) => (
                      <td key={p.id} className="text-center" style={{ minWidth: 200 }}>
                        <button className="btn btn-sm btn-link text-danger float-end" onClick={() => removeFromCompare(p.id)}>×</button>
                        <Link to={`/product/${p.slug}`}>
                          <img src={getProductImage(p)} alt={p.name} style={{ width: 120, aspectRatio: '3/4', objectFit: 'cover', margin: '0 auto' }} />
                          <div className="small fw-medium mt-2">{p.name}</div>
                        </Link>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th className="text-uppercase small">Price</th>
                    {products.map((p) => (
                      <td key={p.id} className="text-center"><PriceDisplay price={p.price} salePrice={p.sale_price} /></td>
                    ))}
                  </tr>
                  <tr>
                    <th className="text-uppercase small">Rating</th>
                    {products.map((p) => (
                      <td key={p.id} className="text-center"><RatingStars rating={p.average_rating ?? 0} /></td>
                    ))}
                  </tr>
                  <tr>
                    <th className="text-uppercase small">Brand</th>
                    {products.map((p) => (
                      <td key={p.id} className="text-center small">{p.brand_name ?? '—'}</td>
                    ))}
                  </tr>
                  <tr>
                    <th className="text-uppercase small">Category</th>
                    {products.map((p) => (
                      <td key={p.id} className="text-center small">{p.category_name ?? '—'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
