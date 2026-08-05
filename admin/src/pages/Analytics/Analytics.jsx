import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import RevenueChart from '../../components/charts/RevenueChart';
import Loader from '../../components/common/Loader';
import analyticsService from '../../services/analyticsService';
import reportService from '../../services/reportService';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const Analytics = () => {
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ov, sales] = await Promise.allSettled([
          analyticsService.overview(period),
          reportService.sales({
            from: new Date(Date.now() - period * 86400000).toISOString().slice(0, 10),
            to: new Date().toISOString().slice(0, 10),
          }),
        ]);
        if (ov.status === 'fulfilled') setOverview(ov.value);
        if (sales.status === 'fulfilled') setSalesData(sales.value || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  if (loading && !overview) return <Loader fullScreen />;

  return (
    <>
      <Helmet><title>Analytics — YULO Admin</title></Helmet>
      <PageHeader
        title="Analytics"
        subtitle="Track performance and growth metrics"
        actions={
          <select className="form-select form-select-sm" style={{ width: 140 }} value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />

      <div className="row g-3 mb-4">
        <div className="col-md-3"><StatCard icon="bi-currency-rupee" label="Revenue" value={formatCurrency(overview?.revenue)} accent="gold" /></div>
        <div className="col-md-3"><StatCard icon="bi-bag" label="Orders" value={formatNumber(overview?.orders)} accent="dark" /></div>
        <div className="col-md-3"><StatCard icon="bi-people" label="New Customers" value={formatNumber(overview?.new_customers)} accent="gold" /></div>
        <div className="col-md-3"><StatCard icon="bi-receipt" label="Avg Order Value" value={formatCurrency(overview?.avg_order_value)} accent="dark" /></div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="yulo-card">
            <div className="yulo-card-header"><h5>Sales Trend</h5></div>
            <div className="yulo-card-body">
              {salesData.length ? (
                <RevenueChart labels={salesData.map((d) => d.date)} data={salesData.map((d) => Number(d.revenue))} />
              ) : (
                <div className="yulo-empty">No sales data for this period</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="yulo-card h-100">
            <div className="yulo-card-header"><h5>Top Categories</h5></div>
            <div className="yulo-card-body p-0">
              {overview?.top_categories?.length ? (
                <table className="table yulo-table mb-0">
                  <thead><tr><th>Category</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {overview.top_categories.map((c, i) => (
                      <tr key={i}><td>{c.name}</td><td>{formatCurrency(c.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="yulo-empty py-4">No category data</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Analytics;
