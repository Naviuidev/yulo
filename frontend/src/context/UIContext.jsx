import { createContext, useCallback, useMemo, useState } from 'react';

export const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((v) => !v), []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const toggleSearch = useCallback(() => setSearchOpen((v) => !v), []);

  const value = useMemo(
    () => ({
      mobileMenuOpen,
      searchOpen,
      globalLoading,
      setGlobalLoading,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      openSearch,
      closeSearch,
      toggleSearch,
    }),
    [mobileMenuOpen, searchOpen, globalLoading, openMobileMenu, closeMobileMenu, toggleMobileMenu, openSearch, closeSearch, toggleSearch]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
