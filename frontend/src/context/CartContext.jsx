import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { cartService } from '../services/cartService';
import { getCartItemUnitPrice, getEffectivePrice } from '../utils/formatPrice';
import { getStoredJson, setStoredJson } from '../utils/helpers';
import { AuthContext } from './AuthContext';

export const CartContext = createContext(null);

const LOCAL_KEY = 'yulo_guest_cart';

export function CartProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await cartService.getCart();
        setItems(res.data?.data?.items ?? res.data?.data ?? []);
      } else {
        setItems(getStoredJson(LOCAL_KEY, []));
      }
    } catch {
      setItems(getStoredJson(LOCAL_KEY, []));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const persistGuest = (next) => {
    setItems(next);
    setStoredJson(LOCAL_KEY, next);
  };

  const addToCart = async (product, options = {}) => {
    const { quantity = 1, variant_id = null, size, color, silent = false } = options;
    const payload = {
      product_id: product.id,
      quantity,
      variant_id,
      size,
      color,
    };

    try {
      if (isAuthenticated) {
        await cartService.addItem(payload);
        await loadCart();
      } else {
        const existing = items.find(
          (i) => i.product_id === product.id && i.variant_id === variant_id
        );
        let next;
        if (existing) {
          next = items.map((i) =>
            i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          next = [
            ...items,
            {
              id: Date.now(),
              product_id: product.id,
              name: product.name,
              slug: product.slug,
              price: getEffectivePrice(product),
              sale_price: product.sale_price,
              regular_price: product.price,
              quantity,
              variant_id,
              size,
              color,
              image: product.primary_image ?? product.image,
            },
          ];
        }
        persistGuest(next);
      }
      if (!silent) toast.success('Added to cart');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not add to cart');
      return false;
    }
  };

  const updateQuantity = async (id, quantity) => {
    if (quantity < 1) return removeItem(id);
    try {
      if (isAuthenticated) {
        await cartService.updateItem(id, { quantity });
        await loadCart();
      } else {
        persistGuest(items.map((i) => (i.id === id ? { ...i, quantity } : i)));
      }
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Update failed');
    }
  };

  const removeItem = async (id) => {
    try {
      if (isAuthenticated) {
        await cartService.removeItem(id);
        await loadCart();
      } else {
        persistGuest(items.filter((i) => i.id !== id));
      }
      toast.info('Removed from cart');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Remove failed');
    }
  };

  const clearCart = async () => {
    try {
      if (isAuthenticated) {
        await cartService.clearCart();
      }
      persistGuest([]);
    } catch {
      persistGuest([]);
    }
  };

  const cartCount = useMemo(
    () => items.reduce((sum, i) => sum + (i.quantity ?? 1), 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + getCartItemUnitPrice(i) * (i.quantity ?? 1), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      cartCount,
      subtotal,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      refreshCart: loadCart,
    }),
    [items, loading, cartCount, subtotal, loadCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
