# Frontend ↔ Backend Integration Guide

## Setup

### 1. Backend (PostgreSQL + FastAPI + ML)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Configure Neon DB:**
Copy and update `.env`:
```bash
cp .env.example .env
```

Set `DATABASE_URL` to your Neon pooled URL:
```
DATABASE_URL=postgresql+psycopg2://<user>:<password>@<your-neon-host>/<db_name>?sslmode=require
JWT_SECRET_KEY=<your-secret-key>
```

**Seed Database** (one-time):
```bash
python -m scripts.seed_db
```

This creates:
- Admin user: `admin@example.com` / `admin12345`
- Guest user: `guest@silkroute.in` / `guest12345`
- 3 sample products

**Reset Database** (if needed):
```bash
python -m scripts.reset_db
python -m scripts.seed_db
```

**Start API**:
```bash
uvicorn main:app --reload
```

API runs on `http://127.0.0.1:8000`. CORS is enabled for local frontend ports.

---

### 2. Frontend (React + Vite)

```bash
cd ..
npm install
```

**Environment** (optional, defaults to `http://127.0.0.1:8000`):
```bash
echo 'VITE_API_BASE_URL=http://127.0.0.1:8000' > .env.local
```

**Start dev server**:
```bash
npm run dev
```

Frontend runs on `http://127.0.0.1:5173`.

---

## Feature Overview

### Admin Dashboard (`/admin`)
- **Login**: `admin@example.com` / `admin12345`
- **Product Manager**: Create, edit, delete products (persisted to DB)
- **ML Dynamic Pricing**: Base prices stored in DB; cart fetches real-time quotes from ML backend
- **Bulk Orders Pipeline**: Demo data from analytics

### Catalog (`/catalog`)
- Fetches all products from backend API
- Real-time ML pricing on product page (calls `/api/products/quote`)
- Quantity-based discount tiers

### Guest/Consumer Login
- `guest@silkroute.in` / `guest12345` (auto-created on first guest login)
- JWT token stored in `sessionStorage` and sent with all API requests
- Cart pricing uses ML-based recommendations

---

## API Endpoints (Backend)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register new user (returns JWT + role) |
| `POST` | `/api/auth/login` | Login (returns JWT + role) |
| `GET` | `/api/products` | List all products |
| `POST` | `/api/products` | Create product (admin only) |
| `PATCH` | `/api/products/{id}` | Update product (admin only) |
| `DELETE` | `/api/products/{id}` | Delete product (admin only) |
| `POST` | `/api/products/quote` | Get ML-priced recommendation for qty |
| `POST` | `/api/orders` | Create order (authenticated users) |
| `GET` | `/health` | Health check |

---

## Data Model

### Product (DB)
- `id`, `sku`, `title`, `fabric`, `origin`
- `short_description`, `detailed_description`
- `base_price` (numeric), `cover_image`, `gallery_images` (JSON)
- `procurement_days`

### Frontend Saree Type
```typescript
{
  id: string;
  sku: string;
  title: string;
  fabric: string;
  origin: string;
  shortDescription: string;
  detailedDescription: string;
  basePrice: number;
  cover: string;
  gallery: string[];
  procurementDays: string;
}
```

---

## ML Pricing Flow

1. **Admin** enters `base_price` when creating/editing product
2. **User** adds items to cart or views product page
3. **Frontend** calls `/api/products/quote` with:
   - `product_id`
   - `order_quantity`
   - `historical_purchase_frequency` (default: 0)
   - `current_season` (default: "regular")
4. **Backend ML** predicts optimal dynamic price using XGBoost fallback
5. **Cart** displays ML-adjusted unit price and total

---

## Testing Workflow

### Test Admin Product Upload
1. Log in: `admin@example.com` / `admin12345`
2. Go to `/admin` → Product Catalog
3. Click "Add product" → fill form → Create
4. Product saved to DB immediately
5. Visible in `/catalog` for all users

### Test ML Pricing
1. Go to `/catalog`
2. Click any product → adjust Qty slider
3. See price change in real-time (API calls `/api/products/quote`)
4. At qty ≥ 10, "Request bulk quote" appears

### Test Cart
1. Add items to cart
2. See ML-adjusted pricing per item
3. Checkout (demo: clears cart + redirects to catalog)

---

## Troubleshooting

**"Cannot connect to database"**
- Ensure Neon connection URL is correct in `.env`
- Test: `psql <your-neon-url>`

**"CORS error" in frontend**
- Verify frontend port (5173) is in backend `CORS_ORIGINS`
- Backend default: `http://localhost:5173`

**"401 Unauthorized" on protected routes**
- Check JWT token is sent with requests
- Frontend stores token in `sessionStorage.auth_token`

**Products not showing**
- Seed DB: `python -m scripts.seed_db`
- Check DB connection: `SELECT COUNT(*) FROM products;`

---

## Next Steps

- Deploy to production with real Neon DB
- Add Razorpay/payment integration
- Build ML training pipeline with historical order data
- Add image upload (instead of URL-only)
- Implement bulk order pipeline with email notifications
