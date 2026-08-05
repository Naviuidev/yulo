import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/ui/ProductCard';
import { productService } from '../../services/productService';
import { MOCK_PRODUCTS } from '../../utils/constants';
import Loader from '../../components/common/Loader';

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.getProducts({ sort: 'newest', per_page: 4 })
      .then((res) => setProducts(res.data?.data ?? MOCK_PRODUCTS.slice(0, 4)))
      .catch(() => setProducts(MOCK_PRODUCTS.slice(0, 4)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-white" data-aos="fade-up">
      <div className="container">
        <div className="d-flex justify-content-between align-items-end mb-5">
          <div>
            <h2 className="section-title mb-0">New Arrivals</h2>
            <div className="gold-line gold-line-left" />
          </div>
          <Link to="/shop?sort=newest" className="small text-uppercase fw-medium text-decoration-none">
            View All →
          </Link>
        </div>
        {loading ? <Loader fullScreen /> : (
          <div className="row g-4">
            {products.map((p, i) => (
              <div key={p.id} className="col-6 col-lg-3">
                <ProductCard product={p} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
