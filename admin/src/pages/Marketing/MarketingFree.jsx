import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { isMasterAdmin } from '../../utils/constants';

const FLOW_STEPS = [
  { id: 'audience', label: 'Audience', icon: 'bi-people' },
  { id: 'compose', label: 'Compose', icon: 'bi-image' },
  { id: 'mode', label: '1:1 / Bulk', icon: 'bi-diagram-3' },
  { id: 'share', label: 'Share', icon: 'bi-send' },
];

export default function MarketingFree() {
  const { user } = useAuth();

  if (!isMasterAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Marketing (Free) — YULO Admin</title>
      </Helmet>

      <div className="yulo-mkt-free-upgrade">
        <motion.div
          className="yulo-mkt-free-upgrade__card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="yulo-mkt-free-upgrade__icon" aria-hidden="true">
            <i className="bi bi-arrow-up-circle" />
          </div>

          <span className="yulo-mkt-free-upgrade__badge">Free plan</span>

          <h1 className="yulo-mkt-free-upgrade__title">Upgrade to Paid</h1>
          <p className="yulo-mkt-free-upgrade__lead">
            Upgrade to the Paid feature to avail this Marketing feature.
          </p>

          <div className="yulo-mkt-free-upgrade__modes">
            <div className="yulo-mkt-free-upgrade__mode">
              <i className="bi bi-person-lines-fill" aria-hidden="true" />
              <div>
                <strong>One to one</strong>
                <span>Personal promotion to selected people</span>
              </div>
            </div>
            <div className="yulo-mkt-free-upgrade__mode">
              <i className="bi bi-envelope-paper" aria-hidden="true" />
              <div>
                <strong>Bulk campaign</strong>
                <span>Broadcast the same offer at scale</span>
              </div>
            </div>
          </div>

          <p className="yulo-mkt-free-upgrade__flow-label">Campaign flow</p>
          <div className="yulo-mkt-free-upgrade-flow" aria-label="Campaign flow">
            {FLOW_STEPS.map((step, index) => (
              <div key={step.id} className="yulo-mkt-free-upgrade-flow__item" style={{ '--i': index }}>
                <div className="yulo-mkt-free-upgrade-flow__node">
                  <i className={`bi ${step.icon}`} aria-hidden="true" />
                  <span>{step.label}</span>
                </div>
                {index < FLOW_STEPS.length - 1 ? (
                  <span className="yulo-mkt-free-upgrade-flow__arrow" aria-hidden="true">
                    <i className="bi bi-chevron-right" />
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
