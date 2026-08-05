import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { compareService } from '../services/cartService';
import { getStoredJson, setStoredJson } from '../utils/helpers';
import { AuthContext } from './AuthContext';

export const CompareContext = createContext(null);

const LOCAL_KEY = 'yulo_compare';
const MAX_ITEMS = 4;

export function CompareProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);

  const loadCompare = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const res = await compareService.getCompare();
        setItems(res.data?.data ?? []);
      } else {
        setItems(getStoredJson(LOCAL_KEY, []));
      }
    } catch {
      setItems(getStoredJson(LOCAL_KEY, []));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCompare();
  }, [loadCompare]);

  const isInCompare = (productId) =>
    items.some((i) => (i.product_id ?? i.id) === productId);

  const addToCompare = async (product) => {
    if (isInCompare(product.id)) {
      toast.info('Already in compare list');
      return;
    }
    if (items.length >= MAX_ITEMS) {
      toast.warning(`Compare up to ${MAX_ITEMS} products`);
      return;
    }
    try {
      if (isAuthenticated) {
        await compareService.addItem(product.id);
        await loadCompare();
      } else {
        const next = [...items, { id: product.id, product_id: product.id, product }];
        setItems(next);
        setStoredJson(LOCAL_KEY, next);
      }
      toast.success('Added to compare');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Compare update failed');
    }
  };

  const removeFromCompare = async (id) => {
    try {
      if (isAuthenticated) {
        await compareService.removeItem(id);
        await loadCompare();
      } else {
        const next = items.filter((i) => (i.product_id ?? i.id) !== id);
        setItems(next);
        setStoredJson(LOCAL_KEY, next);
      }
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      maxItems: MAX_ITEMS,
      isInCompare,
      addToCompare,
      removeFromCompare,
      refreshCompare: loadCompare,
    }),
    [items, loadCompare]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}
