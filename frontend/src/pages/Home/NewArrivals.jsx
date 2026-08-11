import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../components/ui/ProductCard';
import { productService } from '../../services/productService';
import { homeSectionService } from '../../services/homeSectionService';

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [section, setSection] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      homeSectionService.getBySlug('new-arrivals'),
      productService.getProducts({ section: 'new-arrivals', per_page: 8 }),
    ])
      .then(([sectionRes, productsRes]) => {
        setSection(sectionRes.data?.data || null);
        setProducts(productsRes.data?.data || []);
      })
      .catch(() => {
        setSection(null);
        setProducts([]);
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || products.length === 0) return null;

  const title = section?.name || 'New Arrivals';
  const description = section?.description?.trim() || '';

  return (
    <section className="section-padding bg-white" data-aos="fade-up">
      <div className="container">
        <div className="d-flex justify-content-between align-items-end mb-5">
          <div>
            <h2 className="section-title mb-0">{title}</h2>
            <div className="gold-line gold-line-left" />
            {description ? <p className="section-subtitle mb-0">{description}</p> : null}
          </div>
          <Link to="/shop?section=new-arrivals" className="small text-uppercase fw-medium text-decoration-none">
            View All →
          </Link>
        </div>
        <div className="row g-4">
          {products.map((product, i) => (
            <div key={product.id} className="col-6 col-lg-3">
              <ProductCard product={product} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
