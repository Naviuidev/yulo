import { Link } from 'react-router-dom';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="breadcrumb" className="yulo-breadcrumb mb-3">
      <ol className="breadcrumb mb-0">
        <li className="breadcrumb-item">
          <Link to="/">Home</Link>
        </li>
        {items.map((item, i) => (
          <li
            key={item.label}
            className={`breadcrumb-item ${i === items.length - 1 ? 'active' : ''}`}
            aria-current={i === items.length - 1 ? 'page' : undefined}
          >
            {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
