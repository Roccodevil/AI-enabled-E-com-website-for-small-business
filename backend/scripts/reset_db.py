from sqlalchemy import text

from db.base import Base
from db.session import SessionLocal, engine


def reset_db() -> None:
    db = SessionLocal()
    try:
        print("Force-dropping all tables...")
        
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS feedbacks CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS order_items CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS orders CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS products CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
            conn.commit()
        
        print("Creating fresh schema from models...")
        Base.metadata.create_all(bind=engine)
        print("✓ Database reset complete. Run 'python -m scripts.seed_db' to populate.")
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_db()
