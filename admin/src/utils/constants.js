export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
];

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
  shared_response: 'Shared response',
  opted_in: 'Opted in',
  opted_out: 'Opted out',
  sent: 'Sent',
  partial: 'Partial',
  failed: 'Failed',
};

export const STATUS_BADGE_MAP = {
  pending: 'light',
  approved: 'dark',
  rejected: 'light',
  confirmed: 'dark',
  processing: 'dark',
  packed: 'dark',
  shipped: 'dark',
  out_for_delivery: 'dark',
  delivered: 'dark',
  cancelled: 'light',
  returned: 'light',
  refunded: 'light',
  active: 'dark',
  inactive: 'light',
  draft: 'light',
  paid: 'dark',
  failed: 'light',
  shared_response: 'dark',
  initiated: 'light',
  completed: 'dark',
  new: 'dark',
  read: 'light',
  replied: 'dark',
  in_transit: 'dark',
  opted_in: 'dark',
  opted_out: 'light',
  sent: 'dark',
  partial: 'light',
};

export const NAV_ITEMS = [
  { path: '/', icon: 'bi-speedometer2', label: 'Dashboard', feature: 'dashboard' },
  { path: '/orders', icon: 'bi-bag-check', label: 'Orders', feature: 'orders' },
  { path: '/customers', icon: 'bi-people', label: 'Customers', feature: 'customers' },
  { path: '/products', icon: 'bi-box-seam', label: 'Products', feature: 'products' },
  { path: '/categories', icon: 'bi-tags', label: 'Categories', feature: 'categories' },
  { path: '/brands', icon: 'bi-award', label: 'Brands & Sections', feature: 'brands' },
  { path: '/inventory', icon: 'bi-boxes', label: 'Inventory', feature: 'inventory' },
  { path: '/deliveries', icon: 'bi-truck', label: 'Deliveries', feature: 'deliveries' },
  { path: '/followups', icon: 'bi-chat-left-text', label: 'Followups', feature: 'followups' },
  { path: '/offer-strips', icon: 'bi-megaphone', label: 'Offers', feature: 'offer-strips' },
  { path: '/faqs', icon: 'bi-question-circle', label: 'FAQs', feature: 'faqs' },
  { path: '/reviews', icon: 'bi-star', label: 'Reviews', feature: 'reviews' },
  { path: '/notifications', icon: 'bi-bell', label: 'Notifications', feature: 'notifications' },
  { path: '/visitors', icon: 'bi-eye', label: 'Visitors', feature: 'visitors' },
  { path: '/payments', icon: 'bi-credit-card', label: 'Payments', feature: 'payments' },
  { path: '/social-connects', icon: 'bi-share', label: 'Configure Social Connects', feature: 'social-connects' },
  { path: '/marketing', icon: 'bi-broadcast', label: 'Marketing', feature: 'marketing', masterOnly: true },
  { path: '/marketing-free', icon: 'bi-broadcast-pin', label: 'Marketing', feature: 'marketing-free', masterOnly: true, badge: 'Paid' },
  { path: '/admin-config', icon: 'bi-shield-lock', label: 'Admin Config', feature: 'admin-config', masterOnly: true },
  { path: '/doc', icon: 'bi-book', label: 'Doc', feature: 'doc' },
];

export const ADMIN_ROLES = ['admin', 'super_admin', 'staff'];
export const MASTER_ROLES = ['admin', 'super_admin'];

export function isMasterAdmin(user) {
  return MASTER_ROLES.includes(user?.role);
}

export function canAccessFeature(user, featureKey) {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;
  if (user.role !== 'staff') return false;
  if (featureKey === 'admin-config' || featureKey === 'marketing' || featureKey === 'marketing-free') return false;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(featureKey);
}

export function navItemsForUser(user) {
  return NAV_ITEMS.filter((item) => {
    if (item.masterOnly) return isMasterAdmin(user);
    return canAccessFeature(user, item.feature);
  });
}
