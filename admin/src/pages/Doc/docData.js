/**
 * YULO Project Documentation — source of truth for Admin > Doc
 * Update this file as the project evolves.
 */

export const DOC_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'bi-grid' },
  { id: 'setup', label: 'Setup', icon: 'bi-rocket' },
  { id: 'storefront', label: 'Storefront UI', icon: 'bi-shop' },
  { id: 'admin', label: 'Admin UI', icon: 'bi-speedometer2' },
  { id: 'images', label: 'Images & Assets', icon: 'bi-image' },
  { id: 'backend', label: 'Backend API', icon: 'bi-hdd-network' },
  { id: 'database', label: 'Database', icon: 'bi-database' },
  { id: 'next', label: 'Next Steps', icon: 'bi-signpost-2' },
  { id: 'git', label: 'Git', icon: 'bi-git' },
  { id: 'deployment', label: 'Deployment', icon: 'bi-cloud-upload' },
];

export const DOC_ITEMS = [
  // ── Setup ──────────────────────────────────────────────
  {
    id: 'setup-run',
    category: 'setup',
    title: 'How to Run the Project',
    tags: ['commands', 'ports', 'local', 'dev'],
    summary: 'Commands and URLs for API, storefront, and admin.',
    body: [
      { type: 'text', content: 'Run these in separate terminals from the project root.' },
      {
        type: 'files',
        items: [
          { label: 'Backend API', path: 'backend/ → php -S 127.0.0.1:8080 router.php', note: 'http://127.0.0.1:8080/api' },
          { label: 'Storefront', path: 'frontend/ → npm run dev', note: 'http://localhost:5173' },
          { label: 'Admin', path: 'admin/ → npm run dev', note: 'http://localhost:5174' },
        ],
      },
      {
        type: 'creds',
        items: [
          { role: 'Admin', email: 'admin@yulo.com', password: 'Admin@123' },
          { role: 'Customer', email: 'customer@yulo.com', password: 'Customer@123' },
        ],
      },
    ],
  },
  {
    id: 'setup-env',
    category: 'setup',
    title: 'Environment Files',
    tags: ['env', 'config', 'api url'],
    summary: 'Where API URLs and secrets are configured.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Backend env', path: 'backend/.env', note: 'DB, JWT, CORS, PhonePe, Mail' },
          { label: 'Backend example', path: 'backend/.env.example' },
          { label: 'Storefront env', path: 'frontend/.env', note: 'VITE_API_URL=http://127.0.0.1:8080/api' },
          { label: 'Admin env', path: 'admin/.env', note: 'VITE_API_URL=http://127.0.0.1:8080/api' },
        ],
      },
    ],
  },
  {
    id: 'setup-structure',
    category: 'setup',
    title: 'Project Folder Structure',
    tags: ['folders', 'architecture'],
    summary: 'Top-level layout of the YULO monorepo.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Storefront (React)', path: 'frontend/' },
          { label: 'Admin (React)', path: 'admin/' },
          { label: 'API (PHP 8.3)', path: 'backend/' },
          { label: 'Brand logo', path: 'logo.png' },
          { label: 'Root README', path: 'README.md' },
        ],
      },
    ],
  },

  // ── Storefront pages ───────────────────────────────────
  {
    id: 'sf-home',
    category: 'storefront',
    title: 'Homepage',
    tags: ['home', 'hero', 'featured', 'sections'],
    summary: 'Main landing page and all homepage sections.',
    body: [
      { type: 'route', content: 'URL: /  →  frontend/src/pages/Home/Home.jsx' },
      {
        type: 'files',
        items: [
          { label: 'Home shell', path: 'frontend/src/pages/Home/Home.jsx' },
          { label: 'Hero banner', path: 'frontend/src/pages/Home/HeroBanner.jsx' },
          { label: 'Featured Collection', path: 'frontend/src/pages/Home/FeaturedCollection.jsx' },
          { label: 'New Arrivals', path: 'frontend/src/pages/Home/NewArrivals.jsx' },
          { label: 'Trending', path: 'frontend/src/pages/Home/Trending.jsx' },
          { label: 'Best Sellers', path: 'frontend/src/pages/Home/BestSellers.jsx' },
          { label: 'Flash Sale', path: 'frontend/src/pages/Home/FlashSale.jsx' },
          { label: 'Deal of the Day', path: 'frontend/src/pages/Home/DealOfDay.jsx' },
          { label: 'Categories', path: 'frontend/src/pages/Home/Categories.jsx' },
          { label: 'Brands', path: 'frontend/src/pages/Home/Brands.jsx' },
          { label: 'Reviews', path: 'frontend/src/pages/Home/CustomerReviews.jsx' },
          { label: 'Instagram', path: 'frontend/src/pages/Home/InstagramGallery.jsx' },
          { label: 'Blog preview', path: 'frontend/src/pages/Home/BlogPreview.jsx' },
          { label: 'Newsletter', path: 'frontend/src/pages/Home/Newsletter.jsx' },
          { label: 'FAQ section', path: 'frontend/src/pages/Home/FAQSection.jsx' },
          { label: 'Home styles', path: 'frontend/src/styles/home.css' },
        ],
      },
    ],
  },
  {
    id: 'sf-shop',
    category: 'storefront',
    title: 'Shop / Catalog',
    tags: ['shop', 'filters', 'products', 'grid'],
    summary: 'Product listing with filters and sorting.',
    body: [
      { type: 'route', content: 'URL: /shop' },
      {
        type: 'files',
        items: [
          { label: 'Shop page', path: 'frontend/src/pages/Shop/Shop.jsx' },
          { label: 'Product card', path: 'frontend/src/components/ui/ProductCard.jsx' },
          { label: 'Product service', path: 'frontend/src/services/productService.js' },
        ],
      },
    ],
  },
  {
    id: 'sf-product',
    category: 'storefront',
    title: 'Product Detail',
    tags: ['pdp', 'variants', 'zoom', 'reviews'],
    summary: 'Single product page with gallery, variants, related.',
    body: [
      { type: 'route', content: 'URL: /product/:slug' },
      {
        type: 'files',
        items: [
          { label: 'Product page', path: 'frontend/src/pages/Product/Product.jsx' },
          { label: 'Image zoom', path: 'frontend/src/components/ui/ImageZoom.jsx' },
          { label: 'Size / color', path: 'frontend/src/components/ui/SizeSelector.jsx, ColorSwatch.jsx' },
        ],
      },
    ],
  },
  {
    id: 'sf-cart-checkout',
    category: 'storefront',
    title: 'Cart & Checkout',
    tags: ['cart', 'checkout', 'coupon', 'phonepe', 'cod'],
    summary: 'Cart, coupon, guest/login checkout, payments.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Cart', path: 'frontend/src/pages/Cart/Cart.jsx  →  /cart' },
          { label: 'Checkout', path: 'frontend/src/pages/Checkout/Checkout.jsx  →  /checkout' },
          { label: 'Cart context', path: 'frontend/src/context/CartContext.jsx' },
          { label: 'Cart service', path: 'frontend/src/services/cartService.js' },
          { label: 'Order service', path: 'frontend/src/services/orderService.js' },
        ],
      },
      { type: 'api', content: 'POST /checkout/guest · POST /orders · POST /payments/phonepe/initiate · POST /coupons/validate' },
    ],
  },
  {
    id: 'sf-account',
    category: 'storefront',
    title: 'Account Pages',
    tags: ['profile', 'orders', 'wishlist', 'compare', 'auth'],
    summary: 'Auth, profile, orders, wishlist, compare, track order.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Login', path: 'frontend/src/pages/Auth/Login.jsx' },
          { label: 'Register', path: 'frontend/src/pages/Auth/Register.jsx' },
          { label: 'Forgot / Reset', path: 'frontend/src/pages/Auth/ForgotPassword.jsx, ResetPassword.jsx' },
          { label: 'Profile', path: 'frontend/src/pages/Profile/Profile.jsx' },
          { label: 'Orders', path: 'frontend/src/pages/Orders/Orders.jsx, OrderDetail.jsx' },
          { label: 'Wishlist', path: 'frontend/src/pages/Wishlist/Wishlist.jsx' },
          { label: 'Compare', path: 'frontend/src/pages/Compare/Compare.jsx' },
          { label: 'Track Order', path: 'frontend/src/pages/TrackOrder/TrackOrder.jsx' },
          { label: 'Auth context', path: 'frontend/src/context/AuthContext.jsx' },
        ],
      },
    ],
  },
  {
    id: 'sf-content',
    category: 'storefront',
    title: 'Content Pages',
    tags: ['blog', 'about', 'contact', 'faq'],
    summary: 'Blog, about, contact pages.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Blog list', path: 'frontend/src/pages/Blog/Blog.jsx' },
          { label: 'Blog detail', path: 'frontend/src/pages/Blog/BlogDetail.jsx' },
          { label: 'About', path: 'frontend/src/pages/About/About.jsx' },
          { label: 'Contact', path: 'frontend/src/pages/Contact/Contact.jsx' },
        ],
      },
    ],
  },
  {
    id: 'sf-layout',
    category: 'storefront',
    title: 'Storefront Layout & Shared UI',
    tags: ['navbar', 'footer', 'components'],
    summary: 'Shared layout, forms, and UI components.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Layout', path: 'frontend/src/components/layout/Layout.jsx' },
          { label: 'Navbar', path: 'frontend/src/components/layout/Navbar.jsx' },
          { label: 'Footer', path: 'frontend/src/components/layout/Footer.jsx' },
          { label: 'Routes', path: 'frontend/src/routes/AppRoutes.jsx' },
          { label: 'Global styles', path: 'frontend/src/styles/global.css, variables.css' },
          { label: 'Axios API', path: 'frontend/src/services/api.js' },
        ],
      },
    ],
  },

  // ── Images ─────────────────────────────────────────────
  {
    id: 'img-hero',
    category: 'images',
    title: 'Hero Image',
    tags: ['hero', 'homepage', 'unsplash'],
    summary: 'Where the homepage hero background image comes from.',
    body: [
      { type: 'text', content: 'Currently HARDCODED (not from Admin Banners). Uses Unsplash glasses photo.' },
      {
        type: 'files',
        items: [
          { label: 'Constant', path: 'frontend/src/utils/constants.js  →  HERO_IMAGE' },
          { label: 'Used in', path: 'frontend/src/pages/Home/HeroBanner.jsx' },
          { label: 'Brand logo (local)', path: 'frontend/src/assets/logo.png  (+ public/logo.png)' },
        ],
      },
      { type: 'next', content: 'Next: Wire Hero to Admin → Banners (position = home) via API GET /admin/banners or public banners endpoint.' },
    ],
  },
  {
    id: 'img-featured',
    category: 'images',
    title: 'Featured Collection Images',
    tags: ['featured', 'placeholder', 'glasses'],
    summary: 'Second homepage section images (Signature / Sunglasses / Optical).',
    body: [
      { type: 'text', content: 'HARDCODED Unsplash glasses URLs — not from admin or database.' },
      {
        type: 'files',
        items: [
          { label: 'Image URLs array', path: 'frontend/src/utils/constants.js  →  PLACEHOLDER_IMAGES' },
          { label: 'Section UI', path: 'frontend/src/pages/Home/FeaturedCollection.jsx' },
          { label: 'Section CSS', path: 'frontend/src/styles/home.css  →  .featured-collection*' },
        ],
      },
      { type: 'next', content: 'Next: Drive from collections/banners table or category images uploaded in Admin.' },
    ],
  },
  {
    id: 'img-products',
    category: 'images',
    title: 'Product Images',
    tags: ['products', 'uploads', 'primary_image'],
    summary: 'Product photos from DB / uploads, with mock fallback.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'DB table', path: 'product_images (column: image_path)' },
          { label: 'Upload folder', path: 'backend/uploads/products/' },
          { label: 'Seed images', path: 'backend/database/seed.sql' },
          { label: 'Frontend fallback', path: 'frontend/src/utils/constants.js  →  PLACEHOLDER_IMAGES / MOCK_PRODUCTS' },
          { label: 'Product card', path: 'frontend/src/components/ui/ProductCard.jsx' },
        ],
      },
      { type: 'api', content: 'GET /products · GET /products/{slug}  →  returns primary_image + images[]' },
    ],
  },
  {
    id: 'img-logo',
    category: 'images',
    title: 'Brand Logo',
    tags: ['logo', 'yulo', 'branding'],
    summary: 'Official YULO logo locations.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Root', path: 'logo.png' },
          { label: 'Storefront asset', path: 'frontend/src/assets/logo.png' },
          { label: 'Storefront public', path: 'frontend/public/logo.png' },
          { label: 'Admin public', path: 'admin/public/logo.png' },
          { label: 'Hero usage', path: 'frontend/src/pages/Home/HeroBanner.jsx' },
          { label: 'Navbar usage', path: 'frontend/src/components/layout/Navbar.jsx' },
          { label: 'Admin sidebar', path: 'admin/src/components/layout/Sidebar.jsx  →  /logo.png' },
        ],
      },
    ],
  },

  // ── Admin pages ────────────────────────────────────────
  {
    id: 'ad-pages',
    category: 'admin',
    title: 'Admin Pages Map',
    tags: ['admin', 'routes', 'pages'],
    summary: 'Every admin screen and its source file.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Login', path: 'admin/src/pages/Login/Login.jsx  →  /login' },
          { label: 'Dashboard', path: 'admin/src/pages/Dashboard/Dashboard.jsx  →  /' },
          { label: 'Analytics', path: 'admin/src/pages/Analytics/Analytics.jsx' },
          { label: 'Revenue', path: 'admin/src/pages/Revenue/Revenue.jsx' },
          { label: 'Orders', path: 'admin/src/pages/Orders/Orders.jsx, OrderDetail.jsx' },
          { label: 'Customers', path: 'admin/src/pages/Customers/Customers.jsx, CustomerDetail.jsx' },
          { label: 'Products', path: 'admin/src/pages/Products/Products.jsx, ProductForm.jsx' },
          { label: 'Categories', path: 'admin/src/pages/Categories/Categories.jsx' },
          { label: 'Brands', path: 'admin/src/pages/Brands/Brands.jsx' },
          { label: 'Inventory', path: 'admin/src/pages/Inventory/Inventory.jsx' },
          { label: 'Coupons', path: 'admin/src/pages/Coupons/Coupons.jsx' },
          { label: 'Deliveries', path: 'admin/src/pages/Deliveries/Deliveries.jsx' },
          { label: 'Reports', path: 'admin/src/pages/Reports/Reports.jsx' },
          { label: 'Banners', path: 'admin/src/pages/Banners/Banners.jsx' },
          { label: 'Blogs', path: 'admin/src/pages/Blogs/Blogs.jsx' },
          { label: 'FAQs', path: 'admin/src/pages/FAQs/FAQs.jsx' },
          { label: 'Notifications', path: 'admin/src/pages/Notifications/Notifications.jsx' },
          { label: 'Visitors', path: 'admin/src/pages/Visitors/Visitors.jsx' },
          { label: 'Settings', path: 'admin/src/pages/Settings/Settings.jsx' },
          { label: 'Doc (this page)', path: 'admin/src/pages/Doc/Doc.jsx  →  /doc' },
        ],
      },
      { type: 'text', content: 'Routes registered in admin/src/routes/AppRoutes.jsx · Sidebar items in admin/src/utils/constants.js → NAV_ITEMS' },
    ],
  },
  {
    id: 'ad-layout',
    category: 'admin',
    title: 'Admin Layout & Theme',
    tags: ['sidebar', 'css', 'black white'],
    summary: 'Sidebar, topbar, B&W theme styles.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Sidebar', path: 'admin/src/components/layout/Sidebar.jsx' },
          { label: 'Topbar', path: 'admin/src/components/layout/Topbar.jsx' },
          { label: 'Layout', path: 'admin/src/components/layout/AdminLayout.jsx' },
          { label: 'Theme CSS', path: 'admin/src/styles/admin.css' },
          { label: 'Nav config', path: 'admin/src/utils/constants.js  →  NAV_ITEMS' },
        ],
      },
    ],
  },

  // ── Backend ────────────────────────────────────────────
  {
    id: 'be-core',
    category: 'backend',
    title: 'Backend Core Entry Points',
    tags: ['php', 'router', 'api'],
    summary: 'How the PHP REST API boots and routes requests.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Front controller', path: 'backend/index.php' },
          { label: 'Built-in server router', path: 'backend/router.php' },
          { label: 'Apache API entry', path: 'backend/api/index.php' },
          { label: 'Route map', path: 'backend/routes/api.php' },
          { label: 'Router helper', path: 'backend/helpers/Router.php' },
          { label: 'API docs', path: 'backend/api/API.md' },
        ],
      },
    ],
  },
  {
    id: 'be-auth',
    category: 'backend',
    title: 'Auth Controllers',
    tags: ['jwt', 'login', 'register'],
    summary: 'JWT authentication endpoints.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Auth controller', path: 'backend/controllers/AuthController.php' },
          { label: 'JWT helper', path: 'backend/helpers/JWT.php' },
          { label: 'Auth middleware', path: 'backend/middleware/AuthMiddleware.php' },
          { label: 'Admin middleware', path: 'backend/middleware/AdminMiddleware.php' },
          { label: 'User model', path: 'backend/models/User.php' },
        ],
      },
      { type: 'api', content: 'POST /auth/login · /auth/register · /auth/refresh · GET /auth/me' },
    ],
  },
  {
    id: 'be-commerce',
    category: 'backend',
    title: 'Commerce Controllers',
    tags: ['products', 'cart', 'orders', 'coupons'],
    summary: 'Main eCommerce API controllers.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Products', path: 'backend/controllers/ProductController.php' },
          { label: 'Cart', path: 'backend/controllers/CartController.php' },
          { label: 'Orders', path: 'backend/controllers/OrderController.php' },
          { label: 'Checkout / Guest', path: 'backend/controllers/CheckoutController.php' },
          { label: 'Coupons', path: 'backend/controllers/CouponController.php' },
          { label: 'Payments (PhonePe)', path: 'backend/controllers/PaymentController.php' },
          { label: 'Wishlist / Compare', path: 'backend/controllers/WishlistController.php, CompareController.php' },
          { label: 'Reviews', path: 'backend/controllers/ReviewController.php' },
        ],
      },
    ],
  },
  {
    id: 'be-admin-api',
    category: 'backend',
    title: 'Admin API Controllers',
    tags: ['admin', 'crud', 'reports'],
    summary: 'Admin-only endpoints under /admin/*.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Dashboard', path: 'backend/controllers/admin/DashboardController.php' },
          { label: 'Products admin', path: 'backend/controllers/admin/ProductAdminController.php' },
          { label: 'Orders admin', path: 'backend/controllers/admin/OrderAdminController.php' },
          { label: 'Customers', path: 'backend/controllers/admin/CustomerAdminController.php' },
          { label: 'Inventory', path: 'backend/controllers/admin/InventoryAdminController.php' },
          { label: 'Reports', path: 'backend/controllers/admin/ReportAdminController.php' },
          { label: 'Deliveries', path: 'backend/controllers/admin/DeliveryAdminController.php' },
          { label: 'Banners', path: 'backend/controllers/admin/BannerAdminController.php' },
          { label: 'Settings', path: 'backend/controllers/admin/SettingsAdminController.php' },
        ],
      },
      { type: 'api', content: 'All prefixed with /admin/ — require Admin JWT' },
    ],
  },

  // ── Database ───────────────────────────────────────────
  {
    id: 'db-files',
    category: 'database',
    title: 'Database Files',
    tags: ['mysql', 'schema', 'seed', 'sql'],
    summary: 'Where schema and seed data live, and how to import.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Schema (tables)', path: 'backend/database/schema.sql' },
          { label: 'Seed data', path: 'backend/database/seed.sql' },
          { label: 'Admin password seeder', path: 'backend/database/seed.php' },
          { label: 'Password hash helper', path: 'backend/database/seed_passwords.php' },
          { label: 'Verify passwords', path: 'backend/database/verify.php' },
        ],
      },
      {
        type: 'code',
        content: `mysql -u root < backend/database/schema.sql
mysql -u root yulo_db < backend/database/seed.sql
php backend/database/seed.php`,
      },
    ],
  },
  {
    id: 'db-tables',
    category: 'database',
    title: 'Key Database Tables',
    tags: ['tables', 'users', 'products', 'orders'],
    summary: 'Important tables defined in schema.sql.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Users / auth', path: 'users, refresh_tokens, email_verification_tokens' },
          { label: 'Catalog', path: 'categories, brands, products, product_images, product_variants' },
          { label: 'Cart / lists', path: 'carts, cart_items, wishlists, compare_lists' },
          { label: 'Orders', path: 'orders, order_items, payments, deliveries, delivery_partners' },
          { label: 'Marketing', path: 'coupons, banners, blogs, faqs, newsletter_subscribers' },
          { label: 'Account', path: 'addresses, wallets, wallet_transactions, rewards, notifications' },
          { label: 'CMS / settings', path: 'cms_pages, settings, contact_messages, rate_limits' },
          { label: 'Inventory', path: 'inventory_logs' },
        ],
      },
      { type: 'text', content: 'Database name: yulo_db (MySQL 8 / MariaDB via XAMPP)' },
    ],
  },

  // ── Next steps ─────────────────────────────────────────
  {
    id: 'next-eyewear',
    category: 'next',
    title: 'Pivot Catalog to Eyewear',
    tags: ['glasses', 'products', 'seed', 'categories'],
    summary: 'Replace fashion seed products with spectacles / sunglasses.',
    body: [
      {
        type: 'checklist',
        items: [
          'Update categories in seed.sql → Sunglasses, Optical, Blue Light, Kids, Accessories',
          'Replace product rows with glasses SKUs, frame sizes (lens width), colors',
          'Upload real product photos to backend/uploads/products/',
          'Update MOCK_PRODUCTS in frontend/src/utils/constants.js',
          'Change homepage copy still saying “fashion” → eyewear',
        ],
      },
    ],
  },
  {
    id: 'next-dynamic-images',
    category: 'next',
    title: 'Make Homepage Images Dynamic',
    tags: ['banners', 'admin', 'api'],
    summary: 'Stop using hardcoded Unsplash; manage via Admin Banners.',
    body: [
      {
        type: 'checklist',
        items: [
          'Add public GET /banners?position=home endpoint (or use settings)',
          'Wire HeroBanner.jsx to fetch banners',
          'Wire FeaturedCollection.jsx to banners/collections',
          'Upload images via Admin → Banners',
          'Store files in backend/uploads/banners/',
        ],
      },
    ],
  },
  {
    id: 'next-payments',
    category: 'next',
    title: 'PhonePe Live Keys',
    tags: ['phonepe', 'payment', 'env'],
    summary: 'Connect real PhonePe credentials for checkout.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Env keys', path: 'backend/.env  →  PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY' },
          { label: 'Controller', path: 'backend/controllers/PaymentController.php' },
        ],
      },
    ],
  },
  {
    id: 'next-mail',
    category: 'next',
    title: 'Email (Verification / Forgot Password)',
    tags: ['smtp', 'phpmailer', 'mail'],
    summary: 'Enable real email delivery via SMTP.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Mail config', path: 'backend/.env  →  MAIL_*' },
          { label: 'Mailer helper', path: 'backend/helpers/Mailer.php' },
          { label: 'Composer', path: 'backend/composer.json  →  composer install' },
        ],
      },
    ],
  },
  {
    id: 'next-doc-update',
    category: 'next',
    title: 'Keep This Doc Updated',
    tags: ['documentation', 'docData'],
    summary: 'When you add pages/features, update the Doc source.',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Doc UI', path: 'admin/src/pages/Doc/Doc.jsx' },
          { label: 'Doc content', path: 'admin/src/pages/Doc/docData.js  ← edit this' },
        ],
      },
      { type: 'text', content: 'Add new DOC_ITEMS entries with category, title, tags, files, and next-step checklists.' },
    ],
  },

  // ── Git ────────────────────────────────────────────────
  {
    id: 'git-backup',
    category: 'git',
    title: 'Push Code to GitHub (Backup)',
    tags: ['git', 'github', 'commit', 'push'],
    summary: 'Save local changes to GitHub before deploying.',
    body: [
      { type: 'text', content: 'Run from the project root on your Mac. Never commit secrets (backend/.env, deploy.env).' },
      {
        type: 'code',
        content: `cd /Users/naveenreddy/Desktop/NaveenHosur/projects/yulo

git status

git add .
git status

git commit -m "$(cat <<'EOF'
Describe your change in one short sentence.

EOF
)"

git push origin main`,
      },
      {
        type: 'files',
        items: [
          { label: 'Remote repo', path: 'https://github.com/Naviuidev/yulo.git' },
          { label: 'Ignored secrets', path: 'backend/.env, deploy.env, *.zip' },
        ],
      },
    ],
  },
  {
    id: 'git-daily',
    category: 'git',
    title: 'Useful Git Commands',
    tags: ['git', 'status', 'diff', 'log', 'pull'],
    summary: 'Everyday commands for checking and syncing code.',
    body: [
      {
        type: 'code',
        content: `# See changed files
git status

# See what changed
git diff

# Recent commits
git log --oneline -10

# Get latest from GitHub
git pull origin main

# Undo unstaged file edit (careful)
git checkout -- path/to/file

# Unstage a file (keep local changes)
git restore --staged path/to/file`,
      },
    ],
  },

  // ── Deployment ─────────────────────────────────────────
  {
    id: 'deploy-one-command',
    category: 'deployment',
    title: 'Deploy Localhost → Production',
    tags: ['deploy', 'milesweb', 'rsync', 'production'],
    summary: 'Build locally and upload website, admin, and API to MilesWeb.',
    body: [
      { type: 'text', content: 'Recommended order: push to GitHub first, then deploy.' },
      {
        type: 'code',
        content: `cd /Users/naveenreddy/Desktop/NaveenHosur/projects/yulo

# 1) Backup to GitHub
git add .
git commit -m "Your change summary"
git push origin main

# 2) Deploy all (website + admin + API)
./scripts/deploy.sh

# Or deploy only what changed:
./scripts/deploy.sh website
./scripts/deploy.sh admin
./scripts/deploy.sh api
./scripts/deploy.sh website admin`,
      },
      {
        type: 'files',
        items: [
          { label: 'Deploy script', path: 'scripts/deploy.sh' },
          { label: 'SSH config (local only)', path: 'deploy.env  ← copy from deploy.env.example' },
          { label: 'Full guide', path: 'DEPLOY.md' },
        ],
      },
      {
        type: 'checklist',
        items: [
          'Enter MilesWeb SSH password when prompted (website → admin → API)',
          'Production API .env is NOT overwritten by deploy',
          'Hard refresh browser after deploy (Cmd+Shift+R)',
        ],
      },
    ],
  },
  {
    id: 'deploy-urls',
    category: 'deployment',
    title: 'Production URLs & First-Time Setup',
    tags: ['urls', 'env', 'database', 'health'],
    summary: 'Live links and what you edit only once (not every deploy).',
    body: [
      {
        type: 'files',
        items: [
          { label: 'Website', path: 'https://yulowear.in' },
          { label: 'Admin', path: 'https://admin.yulowear.in' },
          { label: 'API health', path: 'https://api.yulowear.in/api/health' },
          { label: 'Storefront API URL', path: 'frontend/.env.production → VITE_API_URL' },
          { label: 'Admin API URL', path: 'admin/.env.production → VITE_API_URL' },
          { label: 'Server API secrets', path: 'api.yulowear.in/.env  (create once; deploy keeps it)' },
        ],
      },
      {
        type: 'checklist',
        items: [
          'First time only: create production API .env on the server',
          'First time only: import backend/database/schema.sql in phpMyAdmin',
          'Only import NEW tables / seed SQL when schema or seed data changes',
          'Normal deploys: no .env edit and no full DB re-import',
        ],
      },
      {
        type: 'code',
        content: `# Optional: passwordless SSH (run once)
ssh-copy-id -p 22 yulowear1@45.199.139.18`,
      },
    ],
  },
];
