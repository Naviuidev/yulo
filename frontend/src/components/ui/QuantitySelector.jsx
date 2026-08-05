export default function QuantitySelector({ value, onChange, min = 1, max = 99 }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="d-inline-flex align-items-center border">
      <button type="button" className="btn btn-sm border-0 px-3" onClick={dec} disabled={value <= min}>
        <i className="bi bi-dash" />
      </button>
      <span className="px-3 fw-medium" style={{ minWidth: 40, textAlign: 'center' }}>{value}</span>
      <button type="button" className="btn btn-sm border-0 px-3" onClick={inc} disabled={value >= max}>
        <i className="bi bi-plus" />
      </button>
    </div>
  );
}
