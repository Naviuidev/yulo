import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import WaveChart from '../../components/charts/WaveChart';
import Loader from '../../components/common/Loader';
import analyticsService from '../../services/analyticsService';
import { formatDateTime, formatNumber } from '../../utils/formatters';

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

const Visitors = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [traffic, setTraffic] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await analyticsService.traffic({ year, month });
        setTraffic(data);
      } catch {
        setTraffic(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

  const series = traffic?.series || [];
  const labels = useMemo(() => series.map((s) => s.label), [series]);
  const viewsData = useMemo(() => series.map((s) => Number(s.page_views || 0)), [series]);
  const visitorsData = useMemo(() => series.map((s) => Number(s.unique_visitors || 0)), [series]);

  const years = useMemo(() => {
    const set = new Set([...(traffic?.available_years || []), year, now.getFullYear()]);
    return [...set].sort((a, b) => b - a);
  }, [traffic?.available_years, year]);

  const periodLabel = month === 'all'
    ? `Year ${year}`
    : `${MONTHS.find((m) => m.value === String(month))?.label || month} ${year}`;

  if (loading && !traffic) return <Loader fullScreen />;

  return (
    <>
      <Helmet><title>Visitors — YULO Admin</title></Helmet>
      <PageHeader
        title="Visitors"
        subtitle={`Storefront traffic · ${periodLabel}`}
        actions={
          <div className="d-flex gap-2 flex-wrap align-items-center">
            <span className="badge yulo-badge yulo-badge--dark">
              Live · {formatNumber(traffic?.live_visitors || 0)}
            </span>
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
        }
      />

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <StatCard icon="bi-eye" label="Page Views" value={formatNumber(traffic?.page_views)} accent="gold" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-people" label="Unique Visitors" value={formatNumber(traffic?.unique_visitors)} accent="dark" />
        </div>
        <div className="col-md-3">
          <StatCard icon="bi-clock" label="Avg. Session" value={traffic?.avg_session_label || '0s'} accent="gold" />
        </div>
        <div className="col-md-3">
          <StatCard
            icon="bi-arrow-return-left"
            label="Bounce Rate"
            value={`${Number(traffic?.bounce_rate || 0).toFixed(1)}%`}
            accent="dark"
          />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <StatCard icon="bi-lightning" label="Sessions" value={formatNumber(traffic?.sessions)} accent="dark" />
        </div>
        <div className="col-md-4">
          <StatCard
            icon="bi-file-earmark-text"
            label="Pages / Session"
            value={Number(traffic?.pages_per_session || 0).toFixed(2)}
            accent="gold"
          />
        </div>
        <div className="col-md-4">
          <StatCard icon="bi-broadcast" label="Live (5 min)" value={formatNumber(traffic?.live_visitors)} accent="dark" />
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="yulo-card">
            <div className="yulo-card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Traffic wave</h5>
              <span className="small text-muted">
                {traffic?.granularity === 'day' ? 'Daily' : 'Monthly'} page views & unique visitors
              </span>
            </div>
            <div className="yulo-card-body">
              {series.length ? (
                <WaveChart
                  labels={labels}
                  datasets={[
                    {
                      label: 'Page views',
                      data: viewsData,
                      borderColor: '#111111',
                      backgroundColor: 'rgba(17, 17, 17, 0.10)',
                    },
                    {
                      label: 'Unique visitors',
                      data: visitorsData,
                      borderColor: '#c4a35a',
                      backgroundColor: 'rgba(196, 163, 90, 0.18)',
                    },
                  ]}
                />
              ) : (
                <div className="yulo-empty">No visitor data for this period yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <div className="yulo-card h-100">
            <div className="yulo-card-header"><h5 className="mb-0">Top pages</h5></div>
            <div className="yulo-card-body p-0">
              {traffic?.top_pages?.length ? (
                <table className="table yulo-table mb-0">
                  <thead>
                    <tr>
                      <th>Path</th>
                      <th>Views</th>
                      <th>Visitors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traffic.top_pages.map((p) => (
                      <tr key={p.path}>
                        <td className="text-break" style={{ maxWidth: 280 }}>{p.path}</td>
                        <td>{formatNumber(p.views)}</td>
                        <td>{formatNumber(p.visitors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="yulo-empty py-4">No page data yet</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="yulo-card h-100">
            <div className="yulo-card-header"><h5 className="mb-0">Devices</h5></div>
            <div className="yulo-card-body p-0">
              {traffic?.devices?.length ? (
                <table className="table yulo-table mb-0">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traffic.devices.map((d) => (
                      <tr key={d.device}>
                        <td className="text-capitalize">{d.device}</td>
                        <td>{formatNumber(d.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="yulo-empty py-4">No device data</div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="yulo-card h-100">
            <div className="yulo-card-header"><h5 className="mb-0">Referrers</h5></div>
            <div className="yulo-card-body p-0">
              {traffic?.top_referrers?.length ? (
                <table className="table yulo-table mb-0">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traffic.top_referrers.map((r) => (
                      <tr key={r.source}>
                        <td className="text-break">{r.source}</td>
                        <td>{formatNumber(r.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="yulo-empty py-4">No referrer data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="yulo-card">
        <div className="yulo-card-header"><h5 className="mb-0">Recent page views</h5></div>
        <div className="yulo-card-body p-0">
          {traffic?.recent?.length ? (
            <table className="table yulo-table mb-0">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Path</th>
                  <th>Device</th>
                  <th>Referrer</th>
                  <th>Visitor</th>
                </tr>
              </thead>
              <tbody>
                {traffic.recent.map((r, i) => (
                  <tr key={`${r.created_at}-${i}`}>
                    <td>{formatDateTime(r.created_at)}</td>
                    <td className="text-break">{r.path}</td>
                    <td className="text-capitalize">{r.device}</td>
                    <td className="text-break" style={{ maxWidth: 200 }}>{r.referrer}</td>
                    <td><code>{r.visitor_id}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="yulo-empty py-4">
              No visits recorded yet. Open the storefront to start collecting accurate visitor data.
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Visitors;
