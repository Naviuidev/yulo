const BADGES = [
  { icon: 'bi-truck', label: 'Free Shipping', sub: 'On orders above ₹999' },
  { icon: 'bi-arrow-repeat', label: 'Easy Returns', sub: '30-day return policy' },
  { icon: 'bi-shield-check', label: 'Secure Payment', sub: '100% protected checkout' },
  { icon: 'bi-headset', label: '24/7 Support', sub: 'Dedicated customer care' },
];

export default function TrustBadges() {
  return (
    <div className="trust-badges">
      {BADGES.map((b) => (
        <div key={b.label} className="trust-badge">
          <i className={`bi ${b.icon}`} />
          <div>
            <strong>{b.label}</strong>
            <div className="text-muted small">{b.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
