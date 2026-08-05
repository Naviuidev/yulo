export default function ProductBadge({ type }) {
  const badges = {
    new: { label: 'New', className: 'bg-dark' },
    sale: { label: 'Sale', className: 'bg-danger' },
    featured: { label: 'Featured', className: 'bg-warning text-dark' },
  };
  const badge = badges[type];
  if (!badge) return null;

  return (
    <span
      className={`badge ${badge.className} position-absolute top-0 start-0 m-2 rounded-0 text-uppercase`}
      style={{ fontSize: '0.625rem', letterSpacing: '0.1em' }}
    >
      {badge.label}
    </span>
  );
}
