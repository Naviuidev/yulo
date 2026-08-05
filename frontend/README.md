# YULO Frontend — Premium Fashion Storefront

React 19 + Vite eCommerce storefront for YULO with luxury black/white/gold design.

## Prerequisites

- Node.js 18+
- npm
- YULO PHP backend running (see `/backend`)

## Setup

```bash
cd frontend
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Edit `.env` if your API URL differs:

```
VITE_API_URL=http://localhost/yulo/backend/api
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Production Build

```bash
npm run build
npm run preview
```

## Tech Stack

- React 19 + Vite
- React Router DOM
- Bootstrap 5 + Bootstrap Icons
- Axios (JWT auth + interceptors)
- React Hook Form
- React Context API
- Framer Motion + AOS
- React Helmet Async (SEO)
- Swiper.js
- React Toastify
- React Lazy Load

## Features

- Full homepage with hero, collections, flash sale, FAQ, newsletter
- Shop with filters (category, brand, price, size, color, rating, sort)
- Product detail with gallery zoom, variants, reviews, related & FBT
- Cart, checkout (guest + auth), coupons, PhonePe/COD/UPI
- Wishlist, compare, profile, addresses, orders, track order
- Blog, contact, about pages
- Lazy-loaded routes, toast notifications, mock fallbacks when API unavailable

## Project Structure

```
src/
├── components/   # common, ui, layout, forms
├── pages/        # Home, Shop, Product, Cart, Checkout, etc.
├── context/      # Auth, Cart, Wishlist, Compare, UI
├── hooks/        # useAuth, useCart, useWishlist, etc.
├── services/     # API layer
├── routes/       # AppRoutes with lazy loading
├── utils/        # helpers, constants, formatPrice
└── styles/       # CSS variables, global, components, home
```
