import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PLACEHOLDER_IMAGES, MOCK_PRODUCTS } from '../../utils/constants';
import PriceDisplay from '../../components/ui/PriceDisplay';
import Button from '../../components/ui/Button';
import { productService } from '../../services/productService';

export default function DealOfDay() {
  const [product, setProduct] = useState(MOCK_PRODUCTS[0]);

  useEffect(() => {
    productService.getProducts({ featured: 1, per_page: 1 })
      .then((res) => {
        const items = res.data?.data ?? MOCK_PRODUCTS;
        if (items[0]) setProduct(items[0]);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="section-padding bg-white" data-aos="fade-up">
      <div className="container">
        <div className="row align-items-center g-5">
          <div className="col-lg-6">
            <span className="badge bg-dark rounded-0 text-uppercase mb-3" style={{ letterSpacing: '0.1em', fontSize: '0.625rem' }}>
              Deal of the Day
            </span>
            <h2 className="section-title">{product.name}</h2>
            <div className="gold-line gold-line-left" />
            <p className="text-muted mb-4">
              Today&apos;s exclusive offer — premium quality at an unbeatable price. Limited stock available.
            </p>
            <PriceDisplay price={product.price} salePrice={product.sale_price} size="lg" />
            <div className="mt-4">
              <Link to={`/product/${product.slug}`}>
                <Button variant="primary">Shop Now</Button>
              </Link>
            </div>
          </div>
          <div className="col-lg-6">
            <Link to={`/product/${product.slug}`}>
              <img
                src={product.primary_image ?? PLACEHOLDER_IMAGES[3]}
                alt={product.name}
                className="w-100"
                style={{ aspectRatio: '4/5', objectFit: 'cover' }}
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
