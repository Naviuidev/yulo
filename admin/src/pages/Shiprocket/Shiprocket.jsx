import { Helmet } from 'react-helmet-async';
import PageHeader from '../../components/common/PageHeader';

export default function Shiprocket() {
  return (
    <>
      <Helmet>
        <title>Shiprocket — YULO Admin</title>
      </Helmet>
      <PageHeader
        title="Shiprocket"
        subtitle="Automated shipping and AWB creation from orders."
      />

      <div className="text-center py-5 px-3">
        <i className="bi bi-rocket-takeoff display-6 text-muted d-block mb-3" aria-hidden />
        <h5 className="mb-2">Shiprocket feature is under development</h5>
        <p className="text-muted mb-0 mx-auto" style={{ maxWidth: 420 }}>
          Configuration and create-shipment from orders will be available here soon. Until then, use{' '}
          <strong>Share Tracking</strong> on each order to add AWB details manually.
        </p>
      </div>
    </>
  );
}
