import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import QuantitySelector from '../../components/ui/QuantitySelector';
import PriceDisplay from '../../components/ui/PriceDisplay';
import Button from '../../components/ui/Button';
import useCart from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatPrice';
import { getProductImage } from '../../utils/helpers';

export default function Cart() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <>
      <SEO title="Shopping Cart" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Cart' }]} />
          <h1>Shopping Cart</h1>
        </div>
      </div>

      <div className="container py-5">
        {items.length === 0 ? (
          <EmptyState icon="bi-bag" title="Your cart is empty" message="Discover our latest collection." actionLabel="Continue Shopping" actionTo="/shop" />
        ) : (
          <div className="row g-5">
            <div className="col-lg-8">
              {items.map((item) => (
                <div key={item.id} className="d-flex gap-3 border-bottom py-4">
                  <Link to={`/product/${item.slug}`}>
                    <img src={getProductImage(item)} alt={item.name} style={{ width: 100, aspectRatio: '3/4', objectFit: 'cover' }} />
                  </Link>
                  <div className="flex-grow-1">
                    <Link to={`/product/${item.slug}`} className="fw-medium text-dark text-decoration-none">{item.name}</Link>
                    {item.size && <div className="small text-muted">Size: {item.size}</div>}
                    {item.color && <div className="small text-muted">Color: {item.color}</div>}
                    <PriceDisplay price={item.price ?? item.unit_price} size="sm" />
                    <div className="d-flex align-items-center gap-3 mt-2">
                      <QuantitySelector value={item.quantity} onChange={(q) => updateQuantity(item.id, q)} />
                      <button className="btn btn-link btn-sm text-muted p-0" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </div>
                  <div className="fw-semibold">{formatPrice((item.price ?? item.unit_price) * item.quantity)}</div>
                </div>
              ))}
              <button className="btn btn-link text-muted p-0 mt-3" onClick={clearCart}>Clear Cart</button>
            </div>
            <div className="col-lg-4">
              <div className="border p-4">
                <h5 className="text-uppercase small fw-semibold mb-4">Order Summary</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 text-muted small">
                  <span>Shipping</span>
                  <span>{subtotal >= 999 ? 'Free' : formatPrice(99)}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-semibold mb-4">
                  <span>Total</span>
                  <span>{formatPrice(subtotal + (subtotal >= 999 ? 0 : 99))}</span>
                </div>
                <Link to="/checkout"><Button className="w-100">Proceed to Checkout</Button></Link>
                <Link to="/shop" className="d-block text-center mt-3 small text-muted">Continue Shopping</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
