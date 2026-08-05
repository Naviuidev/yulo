import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Loader from '../../components/common/Loader';
import analyticsService from '../../services/analyticsService';

const Visitors = () => {
  const [loading, setLoading] = useState(true);
  const [traffic, setTraffic] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await analyticsService.traffic();
        setTraffic(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <Helmet><title>Visitors — YULO Admin</title></Helmet>
      <PageHeader title="Visitors" subtitle="Website traffic and visitor analytics" />

      <div className="row g-3 mb-4">
        <div className="col-md-3"><StatCard icon="bi-eye" label="Page Views" value="—" accent="gold" /></div>
        <div className="col-md-3"><StatCard icon="bi-people" label="Unique Visitors" value="—" accent="dark" /></div>
        <div className="col-md-3"><StatCard icon="bi-clock" label="Avg. Session" value="—" accent="gold" /></div>
        <div className="col-md-3"><StatCard icon="bi-arrow-return-left" label="Bounce Rate" value="—" accent="dark" /></div>
      </div>

      <div className="yulo-card">
        <div className="yulo-card-body yulo-empty py-5">
          <i className="bi bi-graph-up-arrow display-4 d-block mb-3 text-gold opacity-50" />
          <h5>Analytics Integration Pending</h5>
          <p className="text-muted mb-0">{traffic?.message || 'Connect Google Analytics or similar provider for live visitor data.'}</p>
        </div>
      </div>
    </>
  );
};

export default Visitors;
