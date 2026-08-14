import { STATUS_BADGE_MAP, ORDER_STATUS_LABELS } from '../../utils/constants';

/** Monochrome status badge — dark (black) or white (outlined). */
const StatusBadge = ({ status, tone }) => {
  const mapped = tone || STATUS_BADGE_MAP[status] || 'light';
  const variant = mapped === 'dark' ? 'dark' : 'light';
  const label = ORDER_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`badge yulo-badge yulo-badge--${variant} text-capitalize`}>
      {label}
    </span>
  );
};

export default StatusBadge;
