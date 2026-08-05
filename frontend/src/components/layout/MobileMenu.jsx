import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';
import useAuth from '../../hooks/useAuth';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Journal' },
  { to: '/contact', label: 'Contact' },
];

export default function MobileMenu() {
  const { mobileMenuOpen, closeMobileMenu } = useContext(UIContext);
  const { isAuthenticated, logout } = useAuth();

  if (!mobileMenuOpen) return null;

  return (
    <>
      <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50" style={{ zIndex: 1040 }} onClick={closeMobileMenu} />
      <div className="position-fixed top-0 start-0 h-100 bg-white shadow" style={{ width: 280, zIndex: 1050, paddingTop: 'var(--navbar-height)' }}>
        <div className="p-4">
          <button className="btn btn-sm position-absolute top-0 end-0 m-3" onClick={closeMobileMenu}>
            <i className="bi bi-x-lg" />
          </button>
          <nav className="d-flex flex-column gap-3 mt-3">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="text-uppercase fw-medium small" onClick={closeMobileMenu}>
                {l.label}
              </Link>
            ))}
            <hr />
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={closeMobileMenu}>Profile</Link>
                <Link to="/orders" onClick={closeMobileMenu}>Orders</Link>
                <button className="btn btn-link text-start p-0 text-dark" onClick={() => { logout(); closeMobileMenu(); }}>
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" onClick={closeMobileMenu}>Sign In</Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
