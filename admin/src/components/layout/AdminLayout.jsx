import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="yulo-admin">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onMobileClose={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <div className="yulo-sidebar-overlay d-lg-none" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`yulo-main ${sidebarCollapsed ? 'yulo-main--expanded' : ''}`}>
        <Topbar onMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="yulo-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
