import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/formatters';

const Topbar = ({ onMenuToggle, title }) => {
  const { user, logout } = useAuth();

  return (
    <header className="yulo-topbar">
      <div className="d-flex align-items-center gap-3">
        <button type="button" className="btn btn-link yulo-topbar__menu d-lg-none" onClick={onMenuToggle}>
          <i className="bi bi-list fs-4" />
        </button>
        {title && <h2 className="yulo-topbar__title mb-0 d-none d-md-block">{title}</h2>}
      </div>

      <div className="d-flex align-items-center gap-3">
        <div className="yulo-topbar__search d-none d-md-block">
          <i className="bi bi-search" />
          <input type="search" placeholder="Search..." className="form-control form-control-sm" />
        </div>

        <button type="button" className="btn btn-link position-relative text-dark">
          <i className="bi bi-bell fs-5" />
          <span className="yulo-notification-dot" />
        </button>

        <div className="dropdown">
          <button
            className="btn yulo-topbar__user dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <span className="yulo-avatar">{getInitials(user?.name)}</span>
            <span className="d-none d-md-inline ms-2">{user?.name || 'Admin'}</span>
          </button>
          <ul className="dropdown-menu dropdown-menu-end yulo-dropdown">
            <li>
              <span className="dropdown-item-text small text-muted">{user?.email}</span>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button type="button" className="dropdown-item" onClick={logout}>
                <i className="bi bi-box-arrow-right me-2" /> Sign out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
