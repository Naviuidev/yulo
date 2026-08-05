import LazyLoad from 'react-lazy-load';
import { INSTAGRAM_IMAGES } from '../../utils/constants';

export default function InstagramGallery() {
  return (
    <section className="section-padding pt-0" data-aos="fade-up">
      <div className="container text-center mb-4">
        <h2 className="section-title" style={{ fontSize: '1.25rem' }}>@yulofashion</h2>
        <div className="gold-line" />
      </div>
      <div className="instagram-grid">
        {INSTAGRAM_IMAGES.map((img, i) => (
          <a key={i} href="https://instagram.com" target="_blank" rel="noreferrer" className="instagram-grid__item">
            <LazyLoad height="100%">
              <img src={img} alt={`Instagram ${i + 1}`} />
            </LazyLoad>
          </a>
        ))}
      </div>
    </section>
  );
}
