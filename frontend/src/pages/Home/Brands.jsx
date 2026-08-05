import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { brandService } from '../../services/productService';
import { MOCK_BRANDS } from '../../utils/constants';

export default function Brands() {
  const [brands, setBrands] = useState(MOCK_BRANDS);

  useEffect(() => {
    brandService.getBrands()
      .then((res) => setBrands(res.data?.data ?? MOCK_BRANDS))
      .catch(() => {});
  }, []);

  return (
    <section className="section-padding border-top border-bottom" data-aos="fade-up">
      <div className="container">
        <div className="text-center mb-4">
          <h2 className="section-title" style={{ fontSize: '1.25rem' }}>Our Brands</h2>
        </div>
        <div className="brands-strip">
          {brands.map((b) => (
            <Link key={b.id} to={`/shop?brand_id=${b.id}`} className="brand-logo text-decoration-none">
              {b.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
