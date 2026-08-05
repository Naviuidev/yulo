import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import RevenueChart from '../../components/charts/RevenueChart';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import dashboardService from '../../services/dashboardService';
import reportService from '../../services/reportService';
import { formatCurrency } from '../../utils/formatters';

const Revenue = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [daily, setDaily] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, sales] = await Promise.allSettled([
          dashboardService.getStats(),
          reportService.sales({ from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }),
        ]);
        if (dash.status === 'fulfilled') {
          setStats(dash.value?.stats);
          setMonthly(dash.value?.monthly_revenue || []);
        }
        if (sales.status === 'fulfilled') setDaily(sales.value || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loader fullScreen />;

  const monthlyTotal = monthly.reduce((s, m) => s + Number(m.revenue || 0), 0);

  return (
    <>
      <Helmet><title>Revenue — YULO Admin</title></Helmet>
      <PageHeader title="Revenue" subtitle="Financial performance overview" />

      <div className="row g-3 mb-4">
        <div className="col-md-4"><StatCard icon="bi-currency-rupee" label="Total Revenue" value={formatCurrency(stats?.total_revenue)} accent="gold" /></div>
        <div className="col-md-4"><StatCard icon="bi-calendar-month" label="Last 6 Months" value={formatCurrency(monthlyTotal)} accent="dark" /></div>
        <div className="col-md-4"><StatCard icon="bi-graph-up" label="Daily Avg (30d)" value={formatCurrency(daily.length ? daily.reduce((s, d) => s + Number(d.revenue), 0) / daily.length : 0)} accent="gold" /></div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="yulo-card">
            <div className="yulo-card-header"><h5>Monthly Revenue</h5></div>
            <div className="yulo-card-body">
              {monthly.length ? (
                <RevenueChart labels={monthly.map((m) => m.month)} data={monthly.map((m) => Number(m.revenue))} />
              ) : (
                <div className="yulo-empty">No monthly data</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="yulo-card">
            <div className="yulo-card-header"><h5>Daily Revenue (30 days)</h5></div>
            <div className="yulo-card-body">
              {daily.length ? (
                <RevenueChart labels={daily.map((d) => d.date)} data={daily.map((d) => Number(d.revenue))} />
              ) : (
                <div className="yulo-empty">No daily data</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Revenue;
