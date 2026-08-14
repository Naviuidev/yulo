import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import WaveChart from '../../components/charts/WaveChart';
import Loader from '../../components/common/Loader';
import analyticsService from '../../services/analyticsService';
import { formatCurrency, formatNumber } from '../../utils/formatters';

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

const Analytics = ({ embedded = false } = {}) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await analyticsService.overview({ year, month });
        setOverview(data);
      } catch {
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

  const series = overview?.series || [];
  const labels = useMemo(() => series.map((s) => s.label), [series]);
  const revenueData = useMemo(() => series.map((s) => Number(s.revenue || 0)), [series]);
  const ordersData = useMemo(() => series.map((s) => Number(s.paid_orders || 0)), [series]);
  const customersData = useMemo(() => series.map((s) => Number(s.customers || 0)), [series]);

  const years = useMemo(() => {
    const set = new Set([...(overview?.available_years || []), year, now.getFullYear()]);
    return [...set].sort((a, b) => b - a);
  }, [overview?.available_years, year]);

  const periodLabel = month === 'all'
    ? `Year ${year}`
    : `${MONTHS.find((m) => m.value === String(month))?.label || month} ${year}`;

  const periodFilters = (
    <div className="d-flex gap-2 flex-wrap">
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
    </div>
  );

  if (loading && !overview) return <Loader fullScreen={!embedded} />;

  return (
    <>
      {!embedded ? (
        <>
          <Helmet><title>Analytics — YULO Admin</title></Helmet>
          <PageHeader
            title="Analytics"
            subtitle={`Accurate paid-order performance · ${periodLabel}`}
            actions={periodFilters}
          />
        </>
      ) : (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
          <p className="text-muted mb-0 small">Accurate paid-order performance · {periodLabel}</p>
          {periodFilters}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <StatCard icon="bi-currency-rupee" label="Paid Revenue" value={formatCurrency(overview?.revenue)} accent="gold" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-bag-check" label="Paid Orders" value={formatNumber(overview?.paid_orders)} accent="dark" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-people" label="New Customers" value={formatNumber(overview?.new_customers)} accent="gold" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-receipt" label="Avg Order Value" value={formatCurrency(overview?.avg_order_value)} accent="dark" />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="yulo-card">
            <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Revenue wave</h5>
              <span className="small text-muted">
                {overview?.granularity === 'day' ? 'Daily' : 'Monthly'} paid revenue
              </span>
            </div>
            <div className="yulo-card-body">
              {series.length ? (
                <WaveChart
                  currency
                  labels={labels}
                  datasets={[
                    {
                      label: 'Revenue',
                      data: revenueData,
                      borderColor: '#111111',
                      backgroundColor: 'rgba(17, 17, 17, 0.12)',
                    },
                  ]}
                />
              ) : (
                <div className="yulo-empty">No revenue data for this period</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="yulo-card h-100">
            <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Orders & customers wave</h5>
              <span className="small text-muted">Paid orders vs new customers</span>
            </div>
            <div className="yulo-card-body">
              {series.length ? (
                <WaveChart
                  labels={labels}
                  datasets={[
                    {
                      label: 'Paid orders',
                      data: ordersData,
                      borderColor: '#111111',
                      backgroundColor: 'rgba(17, 17, 17, 0.10)',
                    },
                    {
                      label: 'New customers',
                      data: customersData,
                      borderColor: '#c4a35a',
                      backgroundColor: 'rgba(196, 163, 90, 0.18)',
                    },
                  ]}
                />
              ) : (
                <div className="yulo-empty">No order data for this period</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="yulo-card h-100">
            <div className="yulo-card-header">
              <h5 className="mb-0">Top categories</h5>
            </div>
            <div className="yulo-card-body p-0">
              {overview?.top_categories?.length ? (
                <table className="table yulo-table mb-0">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.top_categories.map((c, i) => (
                      <tr key={`${c.name}-${i}`}>
                        <td>{c.name}</td>
                        <td>{formatNumber(c.orders)}</td>
                        <td>{formatCurrency(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="yulo-empty py-4">No category data for this period</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {overview?.orders != null && overview.orders !== overview.paid_orders ? (
        <p className="small text-muted mt-3 mb-0">
          Total placed orders in period: {formatNumber(overview.orders)} · Stats above use paid orders only for accuracy.
        </p>
      ) : null}
    </>
  );
};

export default Analytics;
