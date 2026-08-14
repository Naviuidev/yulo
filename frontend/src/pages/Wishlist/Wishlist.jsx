import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import ProductCard from '../../components/ui/ProductCard';
import useWishlist from '../../hooks/useWishlist';

export default function Wishlist() {
  const { items } = useWishlist();

  const products = items.map((i) => {
    if (i.product) {
      return {
        ...i.product,
        id: i.product.id ?? i.product_id,
        stock: i.product.stock ?? i.stock,
      };
    }
    return {
      ...i,
      id: i.product_id ?? i.id,
      stock: i.stock,
      primary_image: i.primary_image ?? i.image,
    };
  });

  return (
    <>
      <SEO title="Wishlist" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Wishlist' }]} />
          <h1>Wishlist</h1>
        </div>
      </div>

      <div className="container py-5">
        {products.length === 0 ? (
          <EmptyState icon="bi-heart" title="Your wishlist is empty" message="Save items you love for later." actionLabel="Explore Shop" actionTo="/shop" />
        ) : (
          <div className="row g-4">
            {products.map((p, i) => (
              <div key={p.id} className="col-6 col-md-4 col-lg-3">
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
