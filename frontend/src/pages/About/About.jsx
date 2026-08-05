import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/ui/Button';
import { BRAND_NAME, BRAND_TAGLINE, PLACEHOLDER_IMAGES } from '../../utils/constants';

export default function About() {
  return (
    <>
      <SEO title="About Us" description="The story behind YULO premium fashion." />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'About' }]} />
          <h1>About {BRAND_NAME}</h1>
        </div>
      </div>

      <section className="container py-5">
        <div className="row g-5 align-items-center">
          <div className="col-lg-6">
            <img src={PLACEHOLDER_IMAGES[0]} alt="About YULO" className="w-100" style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
          </div>
          <div className="col-lg-6">
            <h2 className="section-title">{BRAND_TAGLINE}</h2>
            <div className="gold-line gold-line-left" />
            <p className="text-muted mb-4">
              YULO was born from a simple belief: fashion should be effortless, refined, and accessible.
              We curate collections that blend timeless silhouettes with contemporary edge — pieces designed
              to elevate your everyday wardrobe.
            </p>
            <p className="text-muted mb-4">
              Every garment is selected for quality, craftsmanship, and versatility. From premium fabrics
              to meticulous finishing, we hold ourselves to the highest standards.
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
