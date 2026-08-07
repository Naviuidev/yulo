<?php

declare(strict_types=1);

/** @var Router $router */

// Public routes
$router->get('/health', fn() => Response::jsonSuccess(['status' => 'ok', 'timestamp' => date('c')]));

// Auth
$router->post('/auth/register', [AuthController::class, 'register']);
$router->post('/auth/login', [AuthController::class, 'login']);
$router->post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
$router->post('/auth/reset-password', [AuthController::class, 'resetPassword']);
$router->post('/auth/verify-email', [AuthController::class, 'verifyEmail']);
$router->post('/auth/resend-otp', [AuthController::class, 'resendOtp']);
$router->post('/auth/refresh', [AuthController::class, 'refresh']);

$router->post('/auth/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->get('/auth/me', [AuthController::class, 'me'], [AuthMiddleware::class]);

// Products (public)
$router->get('/products', [ProductController::class, 'index']);
$router->get('/products/filters', [ProductController::class, 'filters']);
$router->get('/products/search', [ProductController::class, 'search']);
$router->get('/products/{slug}', [ProductController::class, 'show']);
$router->get('/products/{slug}/related', [ProductController::class, 'related']);
$router->get('/products/{slug}/frequently-bought', [ProductController::class, 'frequentlyBought']);

// Categories & Brands
$router->get('/categories', [CategoryController::class, 'index']);
$router->get('/categories/{slug}', [CategoryController::class, 'show']);
$router->get('/brands', [BrandController::class, 'index']);
$router->get('/brands/{slug}', [BrandController::class, 'show']);

// Reviews (public read)
$router->get('/products/{product_id}/reviews', [ReviewController::class, 'index']);

// Coupons validate (public)
$router->post('/coupons/validate', [CouponController::class, 'validate']);

// Content
$router->get('/blogs', [BlogController::class, 'index']);
$router->get('/blogs/{slug}', [BlogController::class, 'show']);
$router->get('/faqs', [FaqController::class, 'index']);
$router->post('/contact', [ContactController::class, 'store']);
$router->post('/newsletter/subscribe', [NewsletterController::class, 'subscribe']);
$router->post('/newsletter/unsubscribe', [NewsletterController::class, 'unsubscribe']);
$router->get('/cms/{slug}', [CmsController::class, 'show']);
$router->get('/settings', [SettingsController::class, 'publicSettings']);
$router->get('/banners', [BannerController::class, 'index']);
$router->get('/offer-strips', [OfferStripController::class, 'index']);

// Payments callback (public webhook)
$router->post('/payments/phonepe/callback', [PaymentController::class, 'phonePeCallback']);

// Authenticated customer routes
$auth = [AuthMiddleware::class];

$router->get('/cart', [CartController::class, 'index'], $auth);
$router->post('/cart', [CartController::class, 'add'], $auth);
$router->put('/cart/{id}', [CartController::class, 'update'], $auth);
$router->delete('/cart/{id}', [CartController::class, 'remove'], $auth);
$router->delete('/cart', [CartController::class, 'clear'], $auth);

$router->get('/wishlist', [WishlistController::class, 'index'], $auth);
$router->post('/wishlist', [WishlistController::class, 'add'], $auth);
$router->post('/wishlist/toggle', [WishlistController::class, 'toggle'], $auth);
$router->delete('/wishlist/{id}', [WishlistController::class, 'remove'], $auth);

$router->get('/compare', [CompareController::class, 'index'], $auth);
$router->post('/compare', [CompareController::class, 'add'], $auth);
$router->delete('/compare/{id}', [CompareController::class, 'remove'], $auth);
$router->delete('/compare', [CompareController::class, 'clear'], $auth);

$router->post('/checkout/guest', [CheckoutController::class, 'guest']);
$router->get('/checkout/summary', [CheckoutController::class, 'summary'], $auth);
$router->get('/orders', [OrderController::class, 'index'], $auth);
$router->post('/orders', [OrderController::class, 'create'], $auth);
$router->get('/orders/track/{order_number}', [OrderController::class, 'trackByNumber']);
$router->get('/orders/{id}', [OrderController::class, 'show'], $auth);
$router->post('/orders/{id}/cancel', [OrderController::class, 'cancel'], $auth);
$router->get('/orders/{id}/track', [OrderController::class, 'track'], $auth);
$router->get('/orders/{id}/invoice', [OrderController::class, 'invoice'], $auth);

$router->post('/reviews', [ReviewController::class, 'store'], $auth);
$router->post('/payments/phonepe/initiate', [PaymentController::class, 'initiatePhonePe'], $auth);

$router->get('/profile', [ProfileController::class, 'show'], $auth);
$router->put('/profile', [ProfileController::class, 'update'], $auth);

$router->get('/addresses', [AddressController::class, 'index'], $auth);
$router->post('/addresses', [AddressController::class, 'store'], $auth);
$router->put('/addresses/{id}', [AddressController::class, 'update'], $auth);
$router->delete('/addresses/{id}', [AddressController::class, 'destroy'], $auth);

$router->get('/wallet', [WalletController::class, 'show'], $auth);
$router->get('/wallet/transactions', [WalletController::class, 'transactions'], $auth);
$router->get('/rewards', [RewardsController::class, 'index'], $auth);

$router->get('/notifications', [NotificationController::class, 'index'], $auth);
$router->post('/notifications/{id}/read', [NotificationController::class, 'markRead'], $auth);
$router->post('/notifications/read-all', [NotificationController::class, 'markAllRead'], $auth);

$router->get('/recently-viewed', [RecentlyViewedController::class, 'index'], $auth);

// Admin routes
$admin = [AdminMiddleware::class];

$router->group('/admin', function (Router $router) use ($admin) {
    $router->get('/dashboard', [DashboardController::class, 'index'], $admin);

    // Products
    $router->get('/products', [ProductAdminController::class, 'index'], $admin);
    $router->post('/products/upload-image', [ProductAdminController::class, 'uploadImage'], $admin);
    $router->post('/products/bulk-upload', [ProductAdminController::class, 'bulkUpload'], $admin);
    $router->get('/products/{id}', [ProductAdminController::class, 'show'], $admin);
    $router->post('/products', [ProductAdminController::class, 'store'], $admin);
    $router->put('/products/{id}', [ProductAdminController::class, 'update'], $admin);
    $router->delete('/products/{id}', [ProductAdminController::class, 'destroy'], $admin);

    // Categories & Brands
    $router->get('/categories', [CategoryAdminController::class, 'index'], $admin);
    $router->post('/categories', [CategoryAdminController::class, 'store'], $admin);
    $router->post('/categories/upload-icon', [CategoryAdminController::class, 'uploadIcon'], $admin);
    $router->put('/categories/{id}', [CategoryAdminController::class, 'update'], $admin);
    $router->delete('/categories/{id}', [CategoryAdminController::class, 'destroy'], $admin);

    $router->get('/brands', [BrandAdminController::class, 'index'], $admin);
    $router->post('/brands', [BrandAdminController::class, 'store'], $admin);
    $router->put('/brands/{id}', [BrandAdminController::class, 'update'], $admin);
    $router->delete('/brands/{id}', [BrandAdminController::class, 'destroy'], $admin);

    // Orders & Customers
    $router->get('/orders', [OrderAdminController::class, 'index'], $admin);
    $router->get('/orders/{id}', [OrderAdminController::class, 'show'], $admin);
    $router->patch('/orders/{id}/status', [OrderAdminController::class, 'updateStatus'], $admin);

    $router->get('/customers', [CustomerAdminController::class, 'index'], $admin);
    $router->get('/customers/{id}', [CustomerAdminController::class, 'show'], $admin);
    $router->patch('/customers/{id}/status', [CustomerAdminController::class, 'updateStatus'], $admin);

    // Coupons
    $router->get('/coupons', [CouponAdminController::class, 'index'], $admin);
    $router->post('/coupons', [CouponAdminController::class, 'store'], $admin);
    $router->put('/coupons/{id}', [CouponAdminController::class, 'update'], $admin);
    $router->delete('/coupons/{id}', [CouponAdminController::class, 'destroy'], $admin);

    // Inventory
    $router->get('/inventory', [InventoryAdminController::class, 'index'], $admin);
    $router->post('/inventory/adjust', [InventoryAdminController::class, 'adjust'], $admin);
    $router->get('/inventory/logs', [InventoryAdminController::class, 'logs'], $admin);

    // Reports & Analytics
    $router->get('/reports/sales', [ReportAdminController::class, 'sales'], $admin);
    $router->get('/reports/products', [ReportAdminController::class, 'products'], $admin);
    $router->get('/reports/customers', [ReportAdminController::class, 'customers'], $admin);
    $router->get('/analytics/overview', [AnalyticsController::class, 'overview'], $admin);
    $router->get('/analytics/traffic', [AnalyticsController::class, 'traffic'], $admin);

    // Deliveries
    $router->get('/deliveries', [DeliveryAdminController::class, 'index'], $admin);
    $router->post('/deliveries', [DeliveryAdminController::class, 'store'], $admin);
    $router->put('/deliveries/{id}', [DeliveryAdminController::class, 'update'], $admin);

    // Banners & Settings
    $router->get('/banners', [BannerAdminController::class, 'index'], $admin);
    $router->post('/banners', [BannerAdminController::class, 'store'], $admin);
    $router->put('/banners/{id}', [BannerAdminController::class, 'update'], $admin);
    $router->delete('/banners/{id}', [BannerAdminController::class, 'destroy'], $admin);

    $router->get('/offer-strips', [OfferStripAdminController::class, 'index'], $admin);
    $router->post('/offer-strips', [OfferStripAdminController::class, 'store'], $admin);
    $router->put('/offer-strips/{id}', [OfferStripAdminController::class, 'update'], $admin);
    $router->delete('/offer-strips/{id}', [OfferStripAdminController::class, 'destroy'], $admin);

    $router->get('/settings', [SettingsAdminController::class, 'index'], $admin);
    $router->put('/settings', [SettingsAdminController::class, 'update'], $admin);

    // Blogs & FAQs
    $router->get('/blogs', [BlogAdminController::class, 'index'], $admin);
    $router->post('/blogs', [BlogAdminController::class, 'store'], $admin);
    $router->put('/blogs/{id}', [BlogAdminController::class, 'update'], $admin);
    $router->delete('/blogs/{id}', [BlogAdminController::class, 'destroy'], $admin);

    $router->get('/faqs', [FaqAdminController::class, 'index'], $admin);
    $router->post('/faqs', [FaqAdminController::class, 'store'], $admin);
    $router->put('/faqs/{id}', [FaqAdminController::class, 'update'], $admin);
    $router->delete('/faqs/{id}', [FaqAdminController::class, 'destroy'], $admin);
});
