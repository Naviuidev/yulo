import { STATUS_BADGE_MAP, ORDER_STATUS_LABELS } from '../../utils/constants';

const StatusBadge = ({ status }) => {
  const variant = STATUS_BADGE_MAP[status] || 'secondary';
  const label = ORDER_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`badge bg-${variant} text-capitalize yulo-badge`}>
      {label}
    </span>
  );
};

export default StatusBadge;
