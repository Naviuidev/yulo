# YULO — Premium Fashion eCommerce Platform

Luxury black & white fashion commerce inspired by Zara, Nike, and Apple.
Tagline: **WEAR YULO. LOOK AWESOME.**

## Stack

| Layer | Technology |
|-------|------------|
| Storefront | React 19, Vite, Bootstrap 5, Framer Motion, Swiper |
| Admin | React 19, Vite, Bootstrap 5, Chart.js |
| API | Core PHP 8.3 REST, JWT |
| Database | MySQL 8 |
| Payments | PhonePe (+ COD / UPI) |
| Server | Apache (XAMPP compatible) |

## Project Structure

```
YULO/
├── frontend/     # Customer storefront (port 5173)
├── admin/        # Admin dashboard (port 5174)
├── backend/      # PHP REST API
└── logo.jpeg     # Official brand logo
```

## Quick Start

### 1. Database

```bash
# Create schema + base admin
mysql -u root -p < backend/database/schema.sql

# Load demo catalog & content
mysql -u root -p yulo_db < backend/database/seed.sql

# Optional: refresh admin password hash
php backend/database/seed.php
```

### 2. Backend API

```bash
cd backend
cp .env.example .env
# Edit DB credentials in .env if needed

composer install   # PHPMailer (optional)

# Recommended for local development (PHP built-in server):
php -S 127.0.0.1:8080 router.php

# API base: http://127.0.0.1:8080/api
# Health:   http://127.0.0.1:8080/api/health

# XAMPP alternative: symlink/copy project into htdocs/yulo
# then use http://localhost/yulo/backend/api
```

### 3. Storefront

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### 4. Admin Dashboard

```bash
cd admin
npm install --legacy-peer-deps
npm run dev
# http://localhost:5174
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@yulo.com | Admin@123 |
| Customer | customer@yulo.com | Customer@123 |

## Design System

| Token | Value |
|-------|-------|
| Primary | `#000000` |
| Secondary | `#FFFFFF` |
| Accent | `#956514` |
| Gray | `#777777` |
| Background | `#F8F8F8` |
| Font | Poppins |

## Features

### Customer
- JWT auth, email verification, forgot password
- Shop filters, product variants, image zoom
- Cart, wishlist, compare, coupons
- Checkout with PhonePe / COD / UPI
- Orders, tracking, invoice download
- Wallet, rewards, reviews, newsletter

### Admin
- Revenue dashboard & charts
- Products, categories, brands, inventory
- Order workflow & deliveries
- Customers, coupons, CMS
- Reports export (CSV / Excel / PDF)

### Platform
- SEO (Helmet, robots.txt, sitemap, OG tags)
- Rate limiting, XSS/SQL injection protection
- Lazy loading & code splitting
- Modular API ready for SaaS expansion

## Environment

**Backend** (`backend/.env`):

```
DB_HOST=127.0.0.1
DB_NAME=yulo_db
DB_USER=root
DB_PASS=
JWT_SECRET=change-this-to-a-long-random-secret-key-min-32-chars
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
PHONEPE_MERCHANT_ID=
PHONEPE_SALT_KEY=
```

**Frontend / Admin**:

```
VITE_API_URL=http://localhost/yulo/backend/api
```

## Phased Delivery

1. Database design (SQL) — done
2. Backend REST API — done
3. React storefront — done
4. React admin dashboard — done
5. Auth, products, cart, checkout — done
6. Orders, reports, PhonePe — done
7. Testing & optimization — next

## License

Proprietary — YULO Fashion. All rights reserved.
