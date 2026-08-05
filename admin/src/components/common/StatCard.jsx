import { motion } from 'framer-motion';

const StatCard = ({ icon, label, value, trend, trendLabel, accent = 'gold' }) => (
  <motion.div
    className="yulo-stat-card"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className={`yulo-stat-card__icon yulo-stat-card__icon--${accent}`}>
      <i className={`bi ${icon}`} />
    </div>
    <div className="yulo-stat-card__body">
      <span className="yulo-stat-card__label">{label}</span>
      <h3 className="yulo-stat-card__value">{value}</h3>
      {trend !== undefined && (
        <span className={`yulo-stat-card__trend ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
          <i className={`bi bi-arrow-${trend >= 0 ? 'up' : 'down'}-short`} />
          {Math.abs(trend)}% {trendLabel || 'vs last period'}
        </span>
      )}
    </div>
  </motion.div>
);

export default StatCard;
