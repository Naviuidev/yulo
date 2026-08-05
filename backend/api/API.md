# YULO REST API Documentation

Base URL: `http://localhost/yulo/backend/api`

All responses:

```json
{ "success": true|false, "message": "...", "data": {}, "errors": {} }
```

Auth header: `Authorization: Bearer <access_token>`

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register customer |
| POST | `/auth/login` | No | Login |
| POST | `/auth/logout` | Yes | Logout |
| POST | `/auth/refresh` | No | Refresh tokens |
| GET | `/auth/me` | Yes | Current user |
| POST | `/auth/forgot-password` | No | Request reset |
| POST | `/auth/reset-password` | No | Reset password |
| POST | `/auth/verify-email` | No | Verify email |

## Catalog

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | No | List (`category_id`, `brand_id`, `search`, `min_price`, `max_price`, `featured`, `is_new`, `is_trending`, `is_bestseller`, `sort`, `page`) |
| GET | `/products/{slug}` | No | Product detail |
| GET | `/products/{slug}/related` | No | Related products |
| GET | `/products/{slug}/frequently-bought` | No | FBT |
| GET | `/products/filters` | No | Filter metadata |
| GET | `/products/search` | No | Search |
| GET | `/categories` | No | Categories |
| GET | `/brands` | No | Brands |
| GET | `/products/{product_id}/reviews` | No | Reviews |
| POST | `/reviews` | Yes | Submit review |

## Cart & Wishlist

| Method | Endpoint | Auth |
|--------|----------|------|
| GET/POST/PUT/DELETE | `/cart`, `/cart/{id}` | Yes |
| GET/POST/DELETE | `/wishlist`, `/wishlist/{id}` | Yes |
| POST | `/wishlist/toggle` | Yes |
| GET/POST/DELETE | `/compare`, `/compare/{id}` | Yes |

## Orders & Payments

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/checkout/summary` | Yes |
| GET/POST | `/orders` | Yes |
| GET | `/orders/{id}` | Yes |
| POST | `/orders/{id}/cancel` | Yes |
| GET | `/orders/{id}/track` | Yes |
| GET | `/orders/{id}/invoice` | Yes |
| POST | `/coupons/validate` | No |
| POST | `/payments/phonepe/initiate` | Yes |
| POST | `/payments/phonepe/callback` | No |

## Content & Account

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/blogs`, `/blogs/{slug}` | No |
| GET | `/faqs` | No |
| POST | `/contact` | No |
| POST | `/newsletter/subscribe` | No |
| GET | `/cms/{slug}` | No |
| GET | `/settings` | No |
| GET/PUT | `/profile` | Yes |
| CRUD | `/addresses` | Yes |
| GET | `/wallet`, `/wallet/transactions` | Yes |
| GET | `/rewards` | Yes |
| GET | `/notifications` | Yes |
| GET | `/recently-viewed` | Yes |

## Admin (`/admin/*` — Admin JWT required)

Dashboard, products, categories, brands, orders, customers, coupons, inventory, reports, analytics, deliveries, banners, blogs, FAQs, settings.

Examples:
- `GET /admin/dashboard`
- `PATCH /admin/orders/{id}/status`
- `GET /admin/reports/sales`
- `POST /admin/products/bulk-upload`
