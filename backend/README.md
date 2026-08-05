# YULO eCommerce REST API

Core PHP 8.3 REST API foundation for the YULO eCommerce platform. No framework — modular, SOLID, and XAMPP/Apache compatible.

## Requirements

- PHP 8.3+
- MySQL 5.7+ / MariaDB 10.3+
- Apache with `mod_rewrite` enabled
- Composer (optional, for PHPMailer)
- XAMPP (recommended for local development)

## Quick Start (XAMPP)

### 1. Copy project to htdocs

```bash
cp -r backend /Applications/XAMPP/xhtdocs/yulo/backend
# Or on Windows: copy to C:\xampp\htdocs\yulo\backend
```

Alternatively, symlink your project:

```bash
ln -s /path/to/yulo/backend /Applications/XAMPP/xhtdocs/yulo/backend
```

### 2. Enable Apache modules

In XAMPP Control Panel, ensure Apache is running. Edit `httpd.conf` and verify:

```apache
LoadModule rewrite_module modules/mod_rewrite.so
```

Set `AllowOverride All` for your htdocs directory.

### 3. Create database

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Import `database/schema.sql`
3. Or run via CLI:

```bash
mysql -u root -p < database/schema.sql
```

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DB_HOST=127.0.0.1
DB_NAME=yulo_db
DB_USER=root
DB_PASS=

JWT_SECRET=your-long-random-secret-key-min-32-characters
APP_URL=http://localhost/yulo/backend
FRONTEND_URL=http://localhost:3000
```

### 5. Install dependencies (optional)

```bash
cd backend
composer install
```

PHPMailer is optional — the API falls back to PHP `mail()` if vendor is missing.

### 6. Set permissions

```bash
chmod -R 755 uploads/
chmod -R 755 /tmp  # for rate limiting cache
```

### 7. Test the API

```bash
curl http://localhost/yulo/backend/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Success",
  "data": { "status": "ok", "timestamp": "..." },
  "errors": {}
}
```

## Default Admin Credentials

| Field    | Value           |
|----------|-----------------|
| Email    | admin@yulo.com  |
| Password | Admin@123       |

Login via `POST /api/auth/login` to obtain JWT tokens.

## API Base URL

```
http://localhost/yulo/backend/api
```

All routes are prefixed with `/api` when accessed through the `api/` directory or via rewrite rules.

## Authentication

JWT Bearer token authentication (HS256, no external library).

```bash
# Login
curl -X POST http://localhost/yulo/backend/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yulo.com","password":"Admin@123"}'

# Use token
curl http://localhost/yulo/backend/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Response Format

All endpoints return consistent JSON:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "errors": {}
}
```

Paginated responses include a `pagination` object.

## Project Structure

```
backend/
├── api/                 # API entry (.htaccess rewrite)
├── config/              # Database, app, CORS config
├── controllers/         # Request handlers
│   └── admin/           # Admin panel controllers
├── database/            # SQL schema
├── helpers/             # Response, JWT, Validator, Router, etc.
├── middleware/          # Auth, Admin, CORS, RateLimit
├── models/              # Thin data access layer
├── routes/              # Route definitions
├── uploads/             # File uploads
├── index.php            # Front controller
├── .htaccess            # Apache rewrite rules
├── .env.example         # Environment template
└── composer.json        # PHPMailer dependency
```

## Key Endpoints

### Public
- `GET /products` — Product listing with filters
- `GET /products/{slug}` — Product detail
- `POST /auth/register` — User registration
- `POST /auth/login` — Login
- `GET /categories`, `/brands`, `/blogs`, `/faqs`
- `GET /settings` — Public site settings

### Authenticated
- `GET/POST /cart` — Shopping cart
- `GET/POST /orders` — Order management
- `POST /payments/phonepe/initiate` — PhonePe payment
- `GET/PUT /profile`, `/addresses`, `/wallet`

### Admin (`/admin/*`)
- `GET /admin/dashboard` — Stats overview
- CRUD for products, categories, brands, orders, coupons
- Inventory, reports, deliveries, analytics
- Banners, blogs, FAQs, settings

## PhonePe Integration

Configure in `.env`:

```env
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=sandbox
PHONEPE_CALLBACK_URL=http://localhost/yulo/backend/api/payments/phonepe/callback
```

Without credentials, the API returns a sandbox redirect URL for development.

## Security Features

- Password hashing via `password_hash()` / `password_verify()`
- Prepared statements for all SQL queries
- JWT authentication with refresh tokens
- Rate limiting (file-based)
- CORS configuration
- XSS sanitization helpers
- CSRF token helpers (for session-based forms)

## Troubleshooting

**404 on all routes:** Enable `mod_rewrite` and set `AllowOverride All`.

**401 on protected routes:** Ensure `Authorization: Bearer <token>` header is sent. Apache strips auth headers unless `.htaccess` rewrite rule is active.

**Database connection failed:** Check `.env` credentials and that MySQL is running in XAMPP.

**CORS errors:** Add your frontend URL to `CORS_ALLOWED_ORIGINS` in `.env`.

## License

Proprietary — YULO eCommerce
