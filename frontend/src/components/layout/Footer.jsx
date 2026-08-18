import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import YuloLogo from '../common/YuloLogo';
import NewsletterForm from '../forms/NewsletterForm';
import { BRAND_TAGLINE } from '../../utils/constants';
import api from '../../services/api';

const FOOTER_LINKS = {
  Shop: [
    { to: '/shop', label: 'All Products' },
    { to: '/shop?sort=newest', label: 'New Arrivals' },
    { to: '/shop?featured=1', label: 'Featured' },
    { to: '/wishlist', label: 'Wishlist' },
  ],
  Help: [
    { to: '/track-order', label: 'Track Order' },
    { to: '/contact', label: 'Contact Us' },
    { to: '/about', label: 'About YULO' },
    { to: '/shipping-policy', label: 'Shipping Policy' },
    { to: '/returns-policy', label: 'Returns & Refunds' },
    { to: '/terms', label: 'Terms & Conditions' },
    { to: '/privacy-policy', label: 'Privacy Policy' },
  ],
  Account: [
    { to: '/login', label: 'Sign In' },
    { to: '/register', label: 'Register' },
    { to: '/profile', label: 'My Profile' },
    { to: '/orders', label: 'My Orders' },
  ],
};

export default function Footer() {
  const [socials, setSocials] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/footer-socials');
        if (!cancelled) setSocials(Array.isArray(data?.data?.items) ? data.data.items : []);
      } catch {
        if (!cancelled) setSocials([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <footer className="yulo-footer">
      <div className="container">
        <div className="row g-4 mb-5">
          <div className="col-lg-4">
            <YuloLogo variant="light" className="yulo-footer__logo" />
            <p className="small opacity-75 mb-3">{BRAND_TAGLINE}</p>
            {socials.length ? (
              <div className="d-flex gap-3 flex-wrap">
                {socials.map((s) => (
                  <a
                    key={s.id || s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`YULO on ${s.label || s.platform}`}
                  >
                    <i className={`bi ${s.icon || 'bi-link-45deg'} fs-5`} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="col-6 col-lg-2">
              <h6>{title}</h6>
              <ul className="list-unstyled">
                {links.map((l) => (
                  <li key={l.to} className="mb-2">
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="col-lg-2">
            <h6>Newsletter</h6>
            <NewsletterForm />
          </div>
        </div>
        <div className="yulo-footer__bottom">
          <span>© {new Date().getFullYear()} YULO. All rights reserved.</span>
          <div className="d-flex flex-wrap gap-3 justify-content-center">
            <Link to="/terms">Terms</Link>
            <Link to="/shipping-policy">Shipping</Link>
            <Link to="/returns-policy">Returns</Link>
            <Link to="/privacy-policy">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
