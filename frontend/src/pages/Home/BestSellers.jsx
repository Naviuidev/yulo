import { useEffect, useState } from 'react';
import ProductCard from '../../components/ui/ProductCard';
import { productService } from '../../services/productService';
import { MOCK_PRODUCTS } from '../../utils/constants';

export default function BestSellers() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productService.getProducts({ sort: 'popular', per_page: 4 })
      .then((res) => setProducts((res.data?.data ?? MOCK_PRODUCTS).slice(0, 4)))
      .catch(() => setProducts(MOCK_PRODUCTS.slice(0, 4)));
  }, []);

  return (
    <section className="section-padding" data-aos="fade-up">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="section-title">Best Sellers</h2>
          <div className="gold-line" />
          <p className="section-subtitle">Most loved by our community</p>
        </div>
        <div className="row g-4">
          {products.map((p, i) => (
            <div key={p.id} className="col-6 col-lg-3">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
