import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CountdownTimer from '../../components/ui/CountdownTimer';
import ProductCard from '../../components/ui/ProductCard';
import { productService } from '../../services/productService';
import { MOCK_PRODUCTS } from '../../utils/constants';

const FLASH_END = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

export default function FlashSale() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productService.getProducts({ per_page: 4 })
      .then((res) => {
        const items = (res.data?.data ?? MOCK_PRODUCTS).filter((p) => p.sale_price).slice(0, 4);
        setProducts(items);
      })
      .catch(() => {
        setProducts(MOCK_PRODUCTS.filter((p) => p.sale_price));
      });
  }, []);

  return (
    <section className="flash-sale section-padding" data-aos="fade-up">
      <div className="container">
        <div className="row align-items-center mb-5">
          <div className="col-md-6">
            <h2 className="section-title">Flash Sale</h2>
            <div className="gold-line gold-line-left" />
            <p className="opacity-75">Limited time offers on selected pieces</p>
          </div>
          <div className="col-md-6 text-md-end mt-3 mt-md-0">
            <CountdownTimer endDate={FLASH_END} />
          </div>
        </div>
        <div className="row g-4">
          {products.map((p, i) => (
            <div key={p.id} className="col-6 col-lg-3">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
        <div className="text-center mt-5">
          <Link to="/shop" className="btn-yulo btn-yulo-gold">Shop Flash Sale</Link>
        </div>
      </div>
    </section>
  );
}
