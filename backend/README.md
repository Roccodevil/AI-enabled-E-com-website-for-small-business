# Backend (FastAPI + ML + PostgreSQL + ChromaDB)

## 1) Create and activate virtual environment

```bash
cd backend
python -m venv venv
source venv/bin/activate
```

## 2) Install dependencies

```bash
pip install -r requirements.txt
```

## 3) Configure environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your Neon pooled Postgres URL from the Neon dashboard.

Expected format:

```text
postgresql+psycopg2://<user>:<password>@<your-neon-host>/<db_name>?sslmode=require
```

Notes:

- `sslmode=require` is mandatory for Neon.
- Keep pool values small for serverless usage (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`).

## 4) (Optional) train a starter pricing model

```bash
python -m ml_engine.train_stub
```

## 5) Run the API

```bash
uvicorn main:app --reload
```

Health check: `GET /health`

## Key API paths

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products/quote`
- `POST /api/products/{product_id}/index`
- `POST /api/orders`
