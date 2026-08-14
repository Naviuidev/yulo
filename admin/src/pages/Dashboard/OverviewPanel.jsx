import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import WaveChart from '../../components/charts/WaveChart';
import dashboardService from '../../services/dashboardService';
import analyticsService from '../../services/analyticsService';
import inventoryService from '../../services/inventoryService';
import notificationService from '../../services/notificationService';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

const MONTHS = [
  { value: 'all', label: 'All months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

/** Overview tab content for the unified Dashboard. */
export default function OverviewPanel({ onOpenReports }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [dash, overview, inventory, notifs] = await Promise.allSettled([
          dashboardService.getStats(),
          analyticsService.overview({ year, month }),
          inventoryService.list({ low_stock: 1, per_page: 5 }),
          notificationService.list(),
        ]);

        if (cancelled) return;

        if (dash.status === 'fulfilled') {
          setStats(dash.value?.stats || {});
          setRecentOrders(dash.value?.recent_orders || []);
        }
        if (overview.status === 'fulfilled') {
          setPeriod(overview.value);
        } else {
          setPeriod(null);
        }
        if (inventory.status === 'fulfilled') {
          setLowStock(inventory.value?.items || []);
        }
        if (notifs.status === 'fulfilled') {
          setNotifications((notifs.value?.items || []).slice(0, 6));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [year, month]);

  const series = period?.series || [];
  const years = useMemo(() => {
    const set = new Set([...(period?.available_years || []), year, now.getFullYear()]);
    return [...set].sort((a, b) => b - a);
  }, [period?.available_years, year]);

  const periodLabel = month === 'all'
    ? `Year ${year}`
    : `${MONTHS.find((m) => m.value === String(month))?.label || month} ${year}`;

  const waveTitle = period?.granularity === 'day' ? 'Daily revenue wave' : 'Monthly revenue wave';
  const ordersWaveTitle = period?.granularity === 'day' ? 'Daily orders wave' : 'Monthly orders wave';

  const orderColumns = [
    { key: 'order_number', label: 'Order #' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
  ];

  const notifIcon = {
    order: 'bi-bag-check',
    stock: 'bi-exclamation-triangle',
    customer: 'bi-person-plus',
    followup: 'bi-chat-left-text',
  };

  const periodFilters = (
    <div className="d-flex gap-2 flex-wrap align-items-center">
      <select
        className="form-select form-select-sm"
        style={{ width: 120 }}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        aria-label="Year"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        className="form-select form-select-sm"
        style={{ width: 160 }}
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        aria-label="Month"
      >
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      <button type="button" className="btn btn-outline-gold btn-sm" onClick={onOpenReports}>
        <i className="bi bi-download me-1" /> Export Report
      </button>
    </div>
  );

  if (loading && !period && !stats) return <Loader text="Loading overview..." />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <p className="text-muted mb-0">
          Overview for <strong className="text-dark">{periodLabel}</strong>
          {loading ? <span className="ms-2 small">Updating…</span> : null}
        </p>
        {periodFilters}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-4 col-xxl-2">
          <StatCard icon="bi-currency-rupee" label="Period Revenue" value={formatCurrency(period?.revenue)} accent="gold" />
        </div>
        <div className="col-sm-6 col-xl-4 col-xxl-2">
          <StatCard icon="bi-bag-check" label="Paid Orders" value={formatNumber(period?.paid_orders)} accent="dark" />
        </div>
        <div className="col-sm-6 col-xl-4 col-xxl-2">
          <StatCard icon="bi-receipt" label="Avg Order Value" value={formatCurrency(period?.avg_order_value)} accent="gold" />
        </div>
        <div className="col-sm-6 col-xl-4 col-xxl-2">
          <StatCard icon="bi-people" label="New Customers" value={formatNumber(period?.new_customers)} accent="dark" />
        </div>
        <div className="col-sm-6 col-xl-4 col-xxl-2">
          <StatCard icon="bi-person-badge" label="All Customers" value={formatNumber(stats?.total_customers)} accent="gold" />
        </div>
        <div className="col-sm-6 col-xl-4 col-xxl-2">
          <StatCard icon="bi-box-seam" label="Products" value={formatNumber(stats?.total_products)} accent="dark" />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="yulo-card">
            <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0"><i className="bi bi-graph-up me-2 text-gold" />{waveTitle}</h5>
              <span className="small text-muted">{periodLabel}</span>
            </div>
            <div className="yulo-card-body">
              {series.length ? (
                <WaveChart
                  currency
                  labels={series.map((s) => s.label)}
                  datasets={[
                    {
                      label: 'Revenue',
                      data: series.map((s) => Number(s.revenue || 0)),
                      borderColor: '#111111',
                      backgroundColor: 'rgba(17, 17, 17, 0.12)',
                    },
                  ]}
                />
              ) : (
                <div className="yulo-empty">
                  <i className="bi bi-graph-up display-4 d-block mb-2 opacity-25" />
                  No revenue data for {periodLabel}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="yulo-card h-100">
            <div className="yulo-card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="bi bi-bell me-2 text-gold" />Notifications</h5>
              <Link to="/notifications" className="btn btn-sm btn-outline-dark">View all</Link>
            </div>
            <div className="yulo-card-body p-0">
              {notifications.length ? notifications.map((n) => (
                <Link
                  key={n.key || n.id}
                  to={n.link || '/notifications'}
                  className={`yulo-alert-item yulo-alert-item--clickable text-decoration-none text-dark ${!n.read ? 'bg-light' : ''}`}
                >
                  <div className="yulo-alert-item__icon" style={{ background: 'rgba(0,0,0,0.08)', color: '#111' }}>
                    <i className={`bi ${notifIcon[n.type] || 'bi-bell'}`} />
                  </div>
                  <span className="small">{n.title}: {n.message}</span>
                </Link>
              )) : (
                <div className="yulo-empty py-4">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="yulo-card">
            <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0"><i className="bi bi-activity me-2 text-gold" />{ordersWaveTitle}</h5>
              <span className="small text-muted">{periodLabel}</span>
            </div>
            <div className="yulo-card-body">
              {series.length ? (
                <WaveChart
                  labels={series.map((s) => s.label)}
                  datasets={[
                    {
                      label: 'Paid orders',
                      data: series.map((s) => Number(s.paid_orders || 0)),
                      borderColor: '#c4a35a',
                      backgroundColor: 'rgba(196, 163, 90, 0.18)',
                    },
                  ]}
                />
              ) : (
                <div className="yulo-empty">No order data for {periodLabel}</div>
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
                        <td>
                          <span className={`badge yulo-badge ${Number(p.stock) <= 0 ? 'yulo-badge--light' : 'yulo-badge--dark'}`}>
                            {p.stock}
                          </span>
                        </td>
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
  );
}
