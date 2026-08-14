import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import OverviewPanel from './OverviewPanel';
import Analytics from '../Analytics/Analytics';
import Revenue from '../Revenue/Revenue';
import Reports from '../Reports/Reports';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
  { id: 'analytics', label: 'Analytics', icon: 'bi-graph-up-arrow' },
  { id: 'revenue', label: 'Revenue', icon: 'bi-currency-rupee' },
  { id: 'reports', label: 'Reports', icon: 'bi-file-earmark-bar-graph' },
];

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'overview';
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (TABS.some((t) => t.id === tabFromUrl) && tabFromUrl !== tab) {
      setTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  const selectTab = (id) => {
    setTab(id);
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  return (
    <>
      <Helmet><title>Dashboard — YULO Admin</title></Helmet>
      <PageHeader
        title="Dashboard"
        subtitle="Overview, analytics, revenue, and exportable reports"
      />

      <div className="yulo-doc-cats mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`yulo-doc-cat ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => selectTab(t.id)}
          >
            <i className={`bi ${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'overview' ? <OverviewPanel onOpenReports={() => selectTab('reports')} /> : null}
      {tab === 'analytics' ? <Analytics embedded /> : null}
      {tab === 'revenue' ? <Revenue embedded /> : null}
      {tab === 'reports' ? <Reports embedded /> : null}
    </>
  );
};

export default Dashboard;
