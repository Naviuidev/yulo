import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import SalesChart from '../../components/charts/SalesChart';
import RevenueChart from '../../components/charts/RevenueChart';
import dashboardService from '../../services/dashboardService';
import reportService from '../../services/reportService';
import inventoryService from '../../services/inventoryService';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [weeklySales, setWeeklySales] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, sales, inventory] = await Promise.allSettled([
          dashboardService.getStats(),
          reportService.sales({
            from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
            to: new Date().toISOString().slice(0, 10),
          }),
          inventoryService.list({ low_stock: 1, per_page: 5 }),
        ]);

        if (dash.status === 'fulfilled') {
          setStats(dash.value?.stats || {});
          setRecentOrders(dash.value?.recent_orders || []);
          setMonthlyRevenue(dash.value?.monthly_revenue || []);
        }
        if (sales.status === 'fulfilled') {
          setWeeklySales(sales.value || []);
        }
        if (inventory.status === 'fulfilled') {
          setLowStock(inventory.value?.items || []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loader fullScreen text="Loading dashboard..." />;

  const monthlyTotal = monthlyRevenue.reduce((s, m) => s + Number(m.revenue || 0), 0);
  const weeklyTotal = weeklySales.reduce((s, d) => s + Number(d.revenue || 0), 0);

  const orderColumns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
  ];

  const notifications = [
    { id: 1, text: `${stats?.pending_orders || 0} orders awaiting confirmation`, icon: 'bi-bag', type: 'order' },
    { id: 2, text: `${stats?.low_stock || 0} products running low on stock`, icon: 'bi-exclamation-triangle', type: 'stock' },
    { id: 3, text: 'New customer registrations this week', icon: 'bi-person-plus', type: 'customer' },
  ];

  return (
    <>
      <Helmet><title>Dashboard — YULO Admin</title></Helmet>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h1 className="yulo-page-title mb-1">Dashboard</h1>
            <p className="text-muted mb-0">Welcome back. Here&apos;s what&apos;s happening today.</p>
          </div>
          <Link to="/reports" className="btn btn-outline-gold btn-sm">
            <i className="bi bi-download me-1" /> Export Report
          </Link>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-4 col-xxl-2">
            <StatCard icon="bi-currency-rupee" label="Total Revenue" value={formatCurrency(stats?.total_revenue)} accent="gold" />
          </div>
          <div className="col-sm-6 col-xl-4 col-xxl-2">
            <StatCard icon="bi-calendar-week" label="Weekly Sales" value={formatCurrency(weeklyTotal)} accent="dark" />
          </div>
          <div className="col-sm-6 col-xl-4 col-xxl-2">
            <StatCard icon="bi-calendar-month" label="Monthly Sales" value={formatCurrency(monthlyTotal)} accent="gold" />
          </div>
          <div className="col-sm-6 col-xl-4 col-xxl-2">
            <StatCard icon="bi-bag-check" label="Total Orders" value={formatNumber(stats?.total_orders)} accent="dark" />
          </div>
          <div className="col-sm-6 col-xl-4 col-xxl-2">
            <StatCard icon="bi-people" label="Customers" value={formatNumber(stats?.total_customers)} accent="gold" />
          </div>
          <div className="col-sm-6 col-xl-4 col-xxl-2">
            <StatCard icon="bi-box-seam" label="Products" value={formatNumber(stats?.total_products)} accent="dark" />
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <div className="yulo-card">
              <div className="yulo-card-header">
                <h5><i className="bi bi-graph-up me-2 text-gold" />Revenue Overview</h5>
              </div>
              <div className="yulo-card-body">
                {monthlyRevenue.length ? (
                  <RevenueChart
                    labels={monthlyRevenue.map((m) => m.month)}
                    data={monthlyRevenue.map((m) => Number(m.revenue))}
                  />
                ) : (
                  <div className="yulo-empty"><i className="bi bi-bar-chart display-4 d-block mb-2 opacity-25" />No revenue data yet</div>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="yulo-card h-100">
              <div className="yulo-card-header">
                <h5><i className="bi bi-bell me-2 text-gold" />Notifications</h5>
              </div>
              <div className="yulo-card-body p-0">
                {notifications.map((n) => (
                  <div key={n.id} className="yulo-alert-item">
                    <div className="yulo-alert-item__icon" style={n.type === 'order' ? { background: 'rgba(149,101,20,0.15)', color: '#956514' } : undefined}>
                      <i className={`bi ${n.icon}`} />
                    </div>
                    <span className="small">{n.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="yulo-card">
              <div className="yulo-card-header">
                <h5><i className="bi bi-activity me-2 text-gold" />Weekly Sales</h5>
              </div>
              <div className="yulo-card-body">
                {weeklySales.length ? (
                  <SalesChart
                    labels={weeklySales.map((d) => formatDate(d.date))}
                    data={weeklySales.map((d) => Number(d.revenue))}
                  />
                ) : (
                  <div className="yulo-empty">No weekly sales data</div>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="yulo-card">
              <div className="yulo-card-header">
                <h5><i className="bi bi-exclamation-triangle me-2 text-danger" />Low Stock Alerts</h5>
                <Link to="/inventory?low_stock=1" className="btn btn-sm btn-outline-dark">View All</Link>
              </div>
              <div className="yulo-card-body p-0">
                {lowStock.length ? (
                  <table className="table yulo-table mb-0">
                    <thead><tr><th>Product</th><th>SKU</th><th>Stock</th></tr></thead>
                    <tbody>
                      {lowStock.map((p) => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td className="text-muted">{p.sku || '—'}</td>
                          <td><span className="badge bg-danger">{p.stock}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="yulo-empty py-4"><i className="bi bi-check-circle text-success me-2" />All stock levels healthy</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="yulo-card">
          <div className="yulo-card-header">
            <h5><i className="bi bi-clock-history me-2 text-gold" />Recent Orders</h5>
            <Link to="/orders" className="btn btn-sm btn-outline-gold">View All</Link>
          </div>
          <DataTable columns={orderColumns} data={recentOrders} emptyMessage="No orders yet." />
        </div>
      </motion.div>
    </>
  );
};

export default Dashboard;
