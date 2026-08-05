import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryService } from '../../services/productService';
import { MOCK_CATEGORIES } from '../../utils/constants';

export default function Categories() {
  const [categories, setCategories] = useState(MOCK_CATEGORIES);

  useEffect(() => {
    categoryService.getCategories()
      .then((res) => setCategories(res.data?.data ?? MOCK_CATEGORIES))
      .catch(() => {});
  }, []);

  return (
    <section className="section-padding" style={{ background: 'var(--bg)' }} data-aos="fade-up">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="section-title">Shop by Category</h2>
          <div className="gold-line" />
        </div>
        <div className="categories-grid">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/shop?category_id=${cat.id}`} className="category-card">
              <img src={cat.image ?? cat.image_path} alt={cat.name} />
              <div className="category-card__overlay">
                <span className="category-card__name">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
