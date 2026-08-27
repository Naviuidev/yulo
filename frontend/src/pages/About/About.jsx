import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import { BRAND_NAME } from '../../utils/constants';

export default function About() {
  return (
    <>
      <SEO
        title="About Us"
        description="Wear YULO, Look Awesome. Contemporary fashion, eyewear and accessories at affordable prices."
      />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'About' }]} />
          <h1>About Us</h1>
        </div>
      </div>

      <section className="container py-5">
        <div className="row g-5 align-items-start">
          <div className="col-lg-6">
            <img
              src="/about-yulo.jpg"
              alt={`${BRAND_NAME} — Style. Quality. You.`}
              className="w-100"
              style={{ display: 'block', objectFit: 'cover' }}
            />
          </div>
          <div className="col-lg-6">
            <h2 className="section-title">Wear YULO, Look Awesome.</h2>
            <div className="gold-line gold-line-left" />

            <p className="text-muted mb-4">
              YULO is a contemporary fashion and lifestyle brand built around one simple idea — looking
              good should never have to cost more.
            </p>
            <p className="text-muted mb-4">
              We bring together fashion, eyewear and accessories that combine modern style, everyday
              comfort and quality at affordable prices. Our collection currently features a curated
              range of men’s wear and accessories, including T-shirts, shirts, trendy eyewear,
              wristbands, belts, caps and more. Women’s wear and accessories are also part of the
              YULO collection.
            </p>
            <p className="text-muted mb-4">
              We carefully select our products with an emphasis on quality, design and value, so you
              can discover fashionable pieces at prices that offer genuine value compared with the
              market.
            </p>
            <p className="text-muted mb-4">
              Whether you are looking for everyday essentials or something to complete your look,
              YULO makes it easy to find styles that fit your personality and your budget.
            </p>
            <p className="fw-medium mb-4">
              YULO — Wear YULO, Look Awesome.
            </p>

            <Link to="/shop"><Button>Explore Collection</Button></Link>
          </div>
        </div>
      </section>

      <section className="py-5" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="row g-4 text-center">
            {[
              { num: '50K+', label: 'Happy Customers' },
              { num: '500+', label: 'Premium Products' },
              { num: '30', label: 'Day Returns' },
              { num: '24/7', label: 'Support' },
            ].map((stat) => (
              <div key={stat.label} className="col-6 col-md-3">
                <div className="display-6 fw-semibold">{stat.num}</div>
                <div className="small text-uppercase text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
