import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import useWishlist from '../../hooks/useWishlist';

export default function BottomNav() {
  const { isAuthenticated } = useAuth();
  const { cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { pathname } = useLocation();

  const accountTo = isAuthenticated ? '/profile' : '/login';
  const accountActive = pathname.startsWith('/profile') || pathname.startsWith('/orders') || pathname === '/login';
  const shopActive = pathname.startsWith('/shop');

  return (
    <nav className="yulo-bottom-nav d-lg-none" aria-label="Mobile quick actions">
      <div className="yulo-bottom-nav__inner">
        <Link
          to="/shop"
          className={`yulo-bottom-nav__item ${shopActive ? 'is-active' : ''}`}
          aria-label="Shop"
        >
          <i className="bi bi-shop" aria-hidden="true" />
          <span className="yulo-bottom-nav__label">Shop</span>
        </Link>

        <Link
          to={accountTo}
          className={`yulo-bottom-nav__item ${accountActive ? 'is-active' : ''}`}
          aria-label={isAuthenticated ? 'Account' : 'Login'}
        >
          <i className="bi bi-person" aria-hidden="true" />
          <span className="yulo-bottom-nav__label">Account</span>
        </Link>

        <Link
          to="/wishlist"
          className={`yulo-bottom-nav__item ${pathname.startsWith('/wishlist') ? 'is-active' : ''}`}
          aria-label="Wishlist"
        >
          <i className="bi bi-heart" aria-hidden="true" />
          <span className="yulo-bottom-nav__label">Wishlist</span>
          {wishlistCount > 0 && <em className="yulo-bottom-nav__badge">{wishlistCount}</em>}
        </Link>

        <Link
          to="/cart"
          className={`yulo-bottom-nav__item ${pathname.startsWith('/cart') || pathname.startsWith('/checkout') ? 'is-active' : ''}`}
          aria-label="Cart"
        >
          <i className="bi bi-bag" aria-hidden="true" />
          <span className="yulo-bottom-nav__label">Cart</span>
          {cartCount > 0 && <em className="yulo-bottom-nav__badge">{cartCount}</em>}
        </Link>
      </div>
    </nav>
  );
}
