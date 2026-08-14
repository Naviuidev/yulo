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
    items.some((i) => Number(i.product_id ?? i.id) === Number(productId));

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
        const next = [
          ...items,
          {
            id: product.id,
            product_id: product.id,
            product: {
              ...product,
              primary_image: product.primary_image ?? product.image,
            },
          },
        ];
        setItems(next);
        setStoredJson(LOCAL_KEY, next);
      }
      toast.success('Added to compare');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Compare update failed');
    }
  };

  const removeFromCompare = async (productOrCompareId) => {
    const id = Number(productOrCompareId);
    try {
      if (isAuthenticated) {
        const row = items.find(
          (i) => Number(i.compare_id ?? i.id) === id || Number(i.product_id ?? i.id) === id
        );
        const apiId = row?.compare_id ?? row?.id ?? id;
        await compareService.removeItem(apiId);
        await loadCompare();
      } else {
        const next = items.filter(
          (i) => Number(i.product_id ?? i.id) !== id && Number(i.id) !== id
        );
        setItems(next);
        setStoredJson(LOCAL_KEY, next);
      }
    } catch {
      /* ignore */
    }
  };

  const clearCompare = async () => {
    try {
      if (isAuthenticated) {
        await compareService.clearCompare();
      }
      setItems([]);
      setStoredJson(LOCAL_KEY, []);
      toast.success('Compare list cleared');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not clear compare');
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
      clearCompare,
      refreshCompare: loadCompare,
    }),
    [items, loadCompare]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}
