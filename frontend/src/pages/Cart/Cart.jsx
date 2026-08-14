import { Link } from 'react-router-dom';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import QuantitySelector from '../../components/ui/QuantitySelector';
import PriceDisplay from '../../components/ui/PriceDisplay';
import Button from '../../components/ui/Button';
import useCart from '../../hooks/useCart';
import { formatPrice, getCartGstTax, getCartItemUnitPrice, getCartShipping } from '../../utils/formatPrice';
import { getProductImage } from '../../utils/helpers';

export default function Cart() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const shipping = getCartShipping(items, subtotal);
  const tax = getCartGstTax(items);
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

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
              {items.map((item) => {
                const unit = getCartItemUnitPrice(item);
                const regular = Number(item.regular_price ?? item.price ?? 0);
                const showSale = regular > unit;
                return (
                  <div key={item.id} className="d-flex gap-3 border-bottom py-4">
                    <Link to={`/product/${item.slug}`}>
                      <img src={getProductImage(item)} alt={item.name} style={{ width: 100, aspectRatio: '3/4', objectFit: 'cover' }} />
                    </Link>
                    <div className="flex-grow-1">
                      <Link to={`/product/${item.slug}`} className="fw-medium text-dark text-decoration-none">{item.name}</Link>
                      {item.size && <div className="small text-muted">Size: {item.size}</div>}
                      {item.color && <div className="small text-muted">Color: {item.color}</div>}
                      <PriceDisplay
                        price={showSale ? regular : unit}
                        salePrice={showSale ? unit : null}
                        size="sm"
                      />
                      <div className="d-flex align-items-center gap-3 mt-2">
                        <QuantitySelector value={item.quantity} onChange={(q) => updateQuantity(item.id, q)} />
                        <button className="btn btn-link btn-sm text-muted p-0" onClick={() => removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                    <div className="fw-semibold">{formatPrice(unit * item.quantity, 'INR', 2)}</div>
                  </div>
                );
              })}
              <button className="btn btn-link text-muted p-0 mt-3" onClick={clearCart}>Clear Cart</button>
            </div>
            <div className="col-lg-4">
              <div className="border p-4">
                <h5 className="text-uppercase small fw-semibold mb-4">Order Summary</h5>
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal, 'INR', 2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 text-muted small">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping, 'INR', 2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 text-muted small">
                  <span>{tax > 0 ? 'GST (18%)' : 'GST'}</span>
                  <span>{tax > 0 ? formatPrice(tax, 'INR', 2) : 'Not applicable'}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-semibold mb-4">
                  <span>Total</span>
                  <span>{formatPrice(total, 'INR', 2)}</span>
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
