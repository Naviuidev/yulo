# YULO Admin Dashboard

Professional React 19 admin panel for the YULO eCommerce platform. Black and gold luxury theme with full store management capabilities.

## Tech Stack

- React 19 + Vite
- React Router DOM
- Bootstrap 5 + Bootstrap Icons
- Axios (JWT auth + interceptors)
- React Hook Form
- React Context API
- React Toastify
- Chart.js + react-chartjs-2
- React Helmet Async
- Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- YULO PHP backend running at `http://localhost/yulo/backend/api`

### Install & Run

```bash
cd admin
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Default Login

- **Email:** admin@yulo.com
- **Password:** Admin@123

## Environment

Copy `.env.example` to `.env`:

```
VITE_API_URL=http://localhost/yulo/backend/api
```

## Features

- **Dashboard** — Revenue, sales, orders, customers, inventory stats, charts, low stock alerts
- **Orders** — Full status workflow (pending → delivered, cancel/return/refund)
- **Products** — CRUD with categories, brands, stock
- **Customers** — Profile, orders, wallet, rewards
- **Inventory** — Stock levels, adjustments, low stock filter
- **Coupons, Deliveries, Reports** — With CSV/Excel/PDF export
- **Content** — Banners, Blogs, FAQs
- **Settings** — Store configuration

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── layout/     # Sidebar, Topbar, AdminLayout
│   ├── common/     # Loader, DataTable, StatCard, etc.
│   └── charts/     # Sales, Revenue, Orders charts
├── context/        # AuthContext
├── pages/          # All admin pages
├── routes/         # AppRoutes
├── services/       # API service layer
├── styles/         # admin.css (black/gold theme)
└── utils/          # Formatters, export helpers
```

## License

Proprietary — YULO eCommerce
