import { Link, NavLink, useNavigate } from 'react-router-dom';
import YuloLogo from '../common/YuloLogo';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';
import { CompareContext } from '../../context/CompareContext';
import { useContext } from 'react';
import { UIContext } from '../../context/UIContext';

const NAV_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop?sort=newest', label: 'New In' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Journal' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { count: compareCount } = useContext(CompareContext);
  const { toggleMobileMenu, toggleSearch } = useContext(UIContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="yulo-navbar navbar navbar-expand-lg">
      <div className="container-fluid px-4">
        <button className="nav-icon-btn d-lg-none me-2" onClick={toggleMobileMenu} aria-label="Menu">
          <i className="bi bi-list" />
        </button>

        <Link className="navbar-brand mx-auto mx-lg-0" to="/">
          <YuloLogo variant="dark" className="yulo-navbar__logo" />
        </Link>

        <div className="collapse navbar-collapse justify-content-center d-none d-lg-flex">
          <ul className="navbar-nav">
            {NAV_LINKS.map((link) => (
              <li key={link.to} className="nav-item">
                <NavLink className="nav-link" to={link.to}>{link.label}</NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="d-flex align-items-center gap-1 ms-lg-auto">
          <button className="nav-icon-btn" onClick={toggleSearch} aria-label="Search">
            <i className="bi bi-search" />
          </button>

          {isAuthenticated ? (
            <div className="dropdown">
              <button className="nav-icon-btn dropdown-toggle border-0 bg-transparent" data-bs-toggle="dropdown">
                <i className="bi bi-person" />
              </button>
              <ul className="dropdown-menu dropdown-menu-end border-0 shadow-sm rounded-0">
                <li className="dropdown-header small text-uppercase">{user?.name}</li>
                <li><Link className="dropdown-item" to="/profile">Profile</Link></li>
                <li><Link className="dropdown-item" to="/orders">Orders</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item" onClick={handleLogout}>Logout</button></li>
              </ul>
            </div>
          ) : (
            <Link to="/login" className="nav-icon-btn" aria-label="Login">
              <i className="bi bi-person" />
            </Link>
          )}

          <Link to="/wishlist" className="nav-icon-btn" aria-label="Wishlist">
            <i className="bi bi-heart" />
            {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
          </Link>

          <Link to="/compare" className="nav-icon-btn d-none d-md-flex" aria-label="Compare">
            <i className="bi bi-arrow-left-right" />
            {compareCount > 0 && <span className="nav-badge">{compareCount}</span>}
          </Link>

          <Link to="/cart" className="nav-icon-btn" aria-label="Cart">
            <i className="bi bi-bag" />
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </Link>
        </div>
      </div>
    </nav>
  );
}
