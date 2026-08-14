import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import useAuth from '../../hooks/useAuth';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/shop?sort=newest', label: 'New In' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/compare', label: 'Compare' },
];

export default function MobileMenu() {
  const { mobileMenuOpen, closeMobileMenu } = useContext(UIContext);
  const { isAuthenticated, logout } = useAuth();

  if (!mobileMenuOpen) return null;

  return (
    <>
      <div
        className="yulo-mobile-menu__backdrop"
        onClick={closeMobileMenu}
        aria-hidden="true"
      />
      <div className="yulo-mobile-menu" role="dialog" aria-label="Menu">
        <div className="yulo-mobile-menu__head">
          <span className="text-uppercase small fw-medium letter-spacing">Menu</span>
          <button type="button" className="nav-icon-btn" onClick={closeMobileMenu} aria-label="Close menu">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <nav className="yulo-mobile-menu__nav">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="yulo-mobile-menu__link" onClick={closeMobileMenu}>
              {l.label}
            </Link>
          ))}
          <hr />
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="yulo-mobile-menu__link" onClick={closeMobileMenu}>Profile</Link>
              <Link to="/orders" className="yulo-mobile-menu__link" onClick={closeMobileMenu}>Orders</Link>
              <button
                type="button"
                className="yulo-mobile-menu__link yulo-mobile-menu__link--btn"
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="yulo-mobile-menu__link" onClick={closeMobileMenu}>
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
