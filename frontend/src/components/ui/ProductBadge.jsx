export default function ProductBadge({ type }) {
  const badges = {
    new: { label: 'New' },
    sale: { label: 'Sale' },
    featured: { label: 'Featured' },
  };
  const badge = badges[type];
  if (!badge) return null;

  return (
    <span className="product-badge">
      {badge.label}
    </span>
  );
}
