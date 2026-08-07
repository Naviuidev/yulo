import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { wishlistService } from '../services/cartService';
import { getStoredJson, setStoredJson } from '../utils/helpers';
import { AuthContext } from './AuthContext';

export const WishlistContext = createContext(null);

const LOCAL_KEY = 'yulo_wishlist';

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [items, setItems] = useState([]);

  const loadWishlist = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const res = await wishlistService.getWishlist();
        setItems(res.data?.data ?? []);
      } else {
        setItems(getStoredJson(LOCAL_KEY, []));
      }
    } catch {
      setItems(getStoredJson(LOCAL_KEY, []));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const isInWishlist = (productId) =>
    items.some((i) => (i.product_id ?? i.id) === productId);

  const toggleWishlist = async (product) => {
    const productId = product.id;
    const exists = isInWishlist(productId);
    try {
      if (isAuthenticated) {
        await wishlistService.toggleItem(productId);
        await loadWishlist();
      } else {
        const next = exists
          ? items.filter((i) => (i.product_id ?? i.id) !== productId)
          : [
              ...items,
              {
                id: productId,
                product_id: productId,
                product: {
                  ...product,
                  primary_image: product.primary_image ?? product.image,
                },
              },
            ];
        setItems(next);
        setStoredJson(LOCAL_KEY, next);
      }
      toast.success(exists ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Wishlist update failed');
    }
  };

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isInWishlist,
      toggleWishlist,
      refreshWishlist: loadWishlist,
    }),
    [items, loadWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
