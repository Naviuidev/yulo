import { NavLink } from 'react-router-dom';
import { navItemsForUser } from '../../utils/constants';
import YuloLogo from '../common/YuloLogo';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ collapsed, mobileOpen, onToggle, onMobileClose }) => {
  const { user } = useAuth();
  const items = navItemsForUser(user);

  return (
    <aside className={`yulo-sidebar ${collapsed ? 'yulo-sidebar--collapsed' : ''} ${mobileOpen ? 'yulo-sidebar--open' : ''}`}>
      <div className="yulo-sidebar__brand">
        <YuloLogo variant="dark" className="yulo-sidebar__logo" />
        {!collapsed && <span className="yulo-sidebar__title">Admin</span>}
      </div>

      <nav className="yulo-sidebar__nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `yulo-sidebar__link ${isActive ? 'yulo-sidebar__link--active' : ''}`
            }
            title={item.label}
          >
            <i className={`bi ${item.icon}`} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="yulo-sidebar__toggle d-none d-lg-flex" onClick={onToggle}>
        <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`} />
      </button>
    </aside>
  );
};

export default Sidebar;
