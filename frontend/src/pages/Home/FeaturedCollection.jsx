import { Link } from 'react-router-dom';
import { PLACEHOLDER_IMAGES } from '../../utils/constants';

export default function FeaturedCollection() {
  return (
    <section className="featured-collection section-padding" data-aos="fade-up">
      <div className="container-fluid px-4">
        <div className="text-center mb-5">
          <h2 className="section-title">Featured Collection</h2>
          <div className="gold-line" />
          <p className="section-subtitle">Curated spectacles & sunglasses for every look</p>
        </div>
        <div className="featured-collection__grid">
          <Link to="/shop" className="featured-collection__main text-decoration-none">
            <img src={PLACEHOLDER_IMAGES[0]} alt="Signature Sunglasses" />
            <div className="featured-collection__label">
              <h3>Signature Sunglasses</h3>
              <span className="small opacity-75">Shop Now →</span>
            </div>
          </Link>
          <div className="featured-collection__side">
            <Link to="/shop" className="featured-collection__item text-decoration-none">
              <img src={PLACEHOLDER_IMAGES[1]} alt="Sunglasses" />
              <div className="featured-collection__label"><h3>Sunglasses</h3></div>
            </Link>
            <Link to="/shop" className="featured-collection__item text-decoration-none">
              <img src={PLACEHOLDER_IMAGES[2]} alt="Optical Glasses" />
              <div className="featured-collection__label"><h3>Optical</h3></div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
