import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import WaveChart from '../../components/charts/WaveChart';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import dashboardService from '../../services/dashboardService';
import reportService, { reportRows } from '../../services/reportService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const Revenue = ({ embedded = false } = {}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [daily, setDaily] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, sales] = await Promise.allSettled([
          dashboardService.getStats(),
          reportService.sales({
            from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
            to: new Date().toISOString().slice(0, 10),
          }),
        ]);
        if (dash.status === 'fulfilled') {
          setStats(dash.value?.stats);
          setMonthly(dash.value?.monthly_revenue || []);
        }
        if (sales.status === 'fulfilled') setDaily(reportRows(sales.value));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loader fullScreen={!embedded} />;

  const monthlyTotal = monthly.reduce((s, m) => s + Number(m.revenue || 0), 0);

  return (
    <>
      {!embedded ? (
        <>
          <Helmet><title>Revenue — YULO Admin</title></Helmet>
          <PageHeader title="Revenue" subtitle="Financial performance overview" />
        </>
      ) : (
        <p className="text-muted small mb-4">Financial performance overview</p>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <StatCard icon="bi-currency-rupee" label="Total Revenue" value={formatCurrency(stats?.total_revenue)} accent="gold" />
        </div>
        <div className="col-md-4">
          <StatCard icon="bi-calendar-month" label="Last 6 Months" value={formatCurrency(monthlyTotal)} accent="dark" />
        </div>
        <div className="col-md-4">
          <StatCard
            icon="bi-graph-up"
            label="Daily Avg (30d)"
            value={formatCurrency(daily.length ? daily.reduce((s, d) => s + Number(d.revenue), 0) / daily.length : 0)}
            accent="gold"
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="yulo-card">
            <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Monthly revenue wave</h5>
              <span className="small text-muted">Last 6 months</span>
            </div>
            <div className="yulo-card-body">
              {monthly.length ? (
                <WaveChart
                  currency
                  labels={monthly.map((m) => m.month)}
                  datasets={[
                    {
                      label: 'Revenue',
                      data: monthly.map((m) => Number(m.revenue || 0)),
                      borderColor: '#111111',
                      backgroundColor: 'rgba(17, 17, 17, 0.12)',
                    },
                  ]}
                />
              ) : (
                <div className="yulo-empty">No monthly data</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="yulo-card">
            <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Daily revenue wave</h5>
              <span className="small text-muted">Last 30 days</span>
            </div>
            <div className="yulo-card-body">
              {daily.length ? (
                <WaveChart
                  currency
                  labels={daily.map((d) => d.label || formatDate(d.date))}
                  datasets={[
                    {
                      label: 'Revenue',
                      data: daily.map((d) => Number(d.revenue || 0)),
                      borderColor: '#c4a35a',
                      backgroundColor: 'rgba(196, 163, 90, 0.18)',
                    },
                  ]}
                />
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
