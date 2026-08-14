const BADGES = [
  { icon: 'bi-truck', label: 'Free Shipping', sub: 'On orders above ₹999' },
  { icon: 'bi-arrow-repeat', label: 'Easy Returns', sub: 'Refund or replace if damaged' },
  { icon: 'bi-shield-check', label: 'Secure Payment', sub: '100% protected checkout' },
  { icon: 'bi-headset', label: '24/7 Support', sub: 'Dedicated customer care' },
];

export default function TrustBadges() {
  return (
    <div className="trust-badges" aria-label="Store promises">
      <div className="trust-badges__grid">
        {BADGES.map((b) => (
          <div key={b.label} className="trust-badge">
            <i className={`bi ${b.icon}`} aria-hidden="true" />
            <div className="trust-badge__text">
              <strong className="trust-badge__label">{b.label}</strong>
              <span className="trust-badge__sub">{b.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
