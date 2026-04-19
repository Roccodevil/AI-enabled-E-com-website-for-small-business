import json
import sys
from datetime import datetime, timedelta

from dotenv import load_dotenv

from core.config import settings
from core.security import hash_password
from db.base import Base
from db.models import Order, OrderItem, Product, User
from db.session import SessionLocal, engine

load_dotenv()

SEED_PRODUCTS = [
    {
        "sku": "BAN-001",
        "title": "Royal Banarasi Silk",
        "fabric": "Pure Banarasi Silk",
        "origin": "Varanasi, Uttar Pradesh",
        "short_description": "Handwoven crimson silk with intricate gold zari brocade.",
        "detailed_description": "Premium Banarasi saree ideal for wedding and ceremonial collections.",
        "base_price": 8499,
        "cost_price": 5200,
        "cover_image": "https://images.unsplash.com/photo-1610189020382-668f65f0f95f?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1610189020382-668f65f0f95f?auto=format&fit=crop&w=1200&q=80"
        ],
        "procurement_days": "5–7 days",
        "inventory_quantity": 120,
    },
    {
        "sku": "KAN-002",
        "title": "Kanjivaram Peacock",
        "fabric": "Mulberry Silk",
        "origin": "Kanchipuram, Tamil Nadu",
        "short_description": "Royal blue Kanjivaram with peacock motifs.",
        "detailed_description": "Traditional pit-loom weave with contrast pallu and zari border.",
        "base_price": 12999,
        "cost_price": 7800,
        "cover_image": "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1200&q=80"
        ],
        "procurement_days": "7–10 days",
        "inventory_quantity": 80,
    },
    {
        "sku": "CHA-003",
        "title": "Chanderi Emerald",
        "fabric": "Chanderi Silk-Cotton",
        "origin": "Chanderi, Madhya Pradesh",
        "short_description": "Lightweight emerald chanderi with floral booti work.",
        "detailed_description": "Elegant daywear saree with a sheer texture and glossy finish.",
        "base_price": 4299,
        "cost_price": 2500,
        "cover_image": "https://images.unsplash.com/photo-1603252109360-909baaf261c7?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1603252109360-909baaf261c7?auto=format&fit=crop&w=1200&q=80"
        ],
        "procurement_days": "3–5 days",
        "inventory_quantity": 200,
    },
]

SEED_USERS = [
    {
        "email": "retail.anjali@example.com",
        "password": "retail123",
        "full_name": "Anjali Sharma",
        "role": "consumer",
        "phone": "+91-9876500011",
        "state": "Maharashtra",
        "city": "Mumbai",
        "address": "Bandra West, Mumbai",
    },
    {
        "email": "retail.meera@example.com",
        "password": "retail123",
        "full_name": "Meera Rao",
        "role": "consumer",
        "phone": "+91-9876500012",
        "state": "Karnataka",
        "city": "Bengaluru",
        "address": "Indiranagar, Bengaluru",
    },
    {
        "email": "wholesale.kapoor@example.com",
        "password": "wholesale123",
        "full_name": "Kapoor Textiles",
        "role": "wholesaler",
        "phone": "+91-9876500021",
        "state": "Delhi",
        "city": "New Delhi",
        "address": "Chandni Chowk, New Delhi",
        "company_name": "Kapoor Saree House",
    },
    {
        "email": "wholesale.southloom@example.com",
        "password": "wholesale123",
        "full_name": "Southloom Distributors",
        "role": "wholesaler",
        "phone": "+91-9876500022",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "address": "T Nagar, Chennai",
        "company_name": "Southloom Pvt Ltd",
    },
    {
        "email": "transit.fastlane@example.com",
        "password": "transport123",
        "full_name": "Fastlane Logistics",
        "role": "transport",
        "phone": "+91-9876500031",
        "state": "Maharashtra",
        "city": "Mumbai",
        "address": "Andheri East, Mumbai",
    },
    {
        "email": "transit.northexpress@example.com",
        "password": "transport123",
        "full_name": "NorthExpress Carriers",
        "role": "transport",
        "phone": "+91-9876500032",
        "state": "Delhi",
        "city": "New Delhi",
        "address": "Karol Bagh, New Delhi",
    },
]

SEED_ORDERS = [
    {
        "buyer": "retail.anjali@example.com",
        "transport": "transit.fastlane@example.com",
        "status": "delivered",
        "days_ago": 18,
        "eta_days": 6,
        "items": {"BAN-001": 2, "CHA-003": 1},
    },
    {
        "buyer": "retail.meera@example.com",
        "transport": "transit.fastlane@example.com",
        "status": "in_transit",
        "days_ago": 7,
        "eta_days": 4,
        "items": {"KAN-002": 1, "CHA-003": 2},
    },
    {
        "buyer": "wholesale.kapoor@example.com",
        "transport": "transit.northexpress@example.com",
        "status": "delivered",
        "days_ago": 22,
        "eta_days": 5,
        "items": {"BAN-001": 18, "KAN-002": 12},
    },
    {
        "buyer": "wholesale.southloom@example.com",
        "transport": "transit.fastlane@example.com",
        "status": "out_for_delivery",
        "days_ago": 4,
        "eta_days": 3,
        "items": {"CHA-003": 30, "KAN-002": 8},
    },
    {
        "buyer": "wholesale.kapoor@example.com",
        "transport": "transit.northexpress@example.com",
        "status": "dispatched",
        "days_ago": 2,
        "eta_days": 4,
        "items": {"BAN-001": 10, "CHA-003": 20},
    },
]


def _merge_order_preferences(existing: str | None, ordered_fabrics: list[str]) -> str | None:
    if not ordered_fabrics:
        return existing
    existing_list = [item.strip() for item in (existing or "").split(",") if item.strip()]
    merged = existing_list + ordered_fabrics
    counts: dict[str, int] = {}
    for value in merged:
        counts[value] = counts.get(value, 0) + 1
    ordered = sorted(counts.items(), key=lambda pair: pair[1], reverse=True)
    top = [name for name, _count in ordered[:5]]
    return ", ".join(top)


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create only the admin account with fixed credentials
        # Create admin account with credentials from environment
        admin_email = settings.admin_email
        admin_password = settings.admin_password
        
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                full_name="Admin",
                role="admin",
                is_active=True,
            )
            db.add(admin)
            print("✓ Admin account created")
            print(f"  Email: {admin_email}")
            print(f"  Password: {admin_password}")

        # Seed sample products
        for product_data in SEED_PRODUCTS:
            existing = db.query(Product).filter(Product.sku == product_data["sku"]).first()
            if existing:
                continue
            db.add(
                Product(
                    sku=product_data["sku"],
                    title=product_data["title"],
                    description=product_data["short_description"],
                    fabric=product_data["fabric"],
                    origin=product_data["origin"],
                    short_description=product_data["short_description"],
                    detailed_description=product_data["detailed_description"],
                    base_price=product_data["base_price"],
                    cost_price=product_data["cost_price"],
                    cover_image=product_data["cover_image"],
                    gallery_images=json.dumps(product_data["gallery_images"]),
                    procurement_days=product_data["procurement_days"],
                    inventory_quantity=product_data["inventory_quantity"],
                )
            )

        db.commit()

        # Seed fake users for testing analytics
        for user_data in SEED_USERS:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if existing_user:
                continue
            db.add(
                User(
                    email=user_data["email"],
                    password_hash=hash_password(user_data["password"]),
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    is_active=True,
                    phone=user_data.get("phone"),
                    company_name=user_data.get("company_name"),
                    state=user_data.get("state"),
                    city=user_data.get("city"),
                    address=user_data.get("address"),
                )
            )

        db.commit()

        # Seed historical orders only once
        existing_seed_orders = db.query(Order).filter(Order.idempotency_key.like("seed-order-%")).count()
        if existing_seed_orders == 0:
            products_by_sku = {product.sku: product for product in db.query(Product).all()}
            users_by_email = {user.email: user for user in db.query(User).all()}

            for index, order_data in enumerate(SEED_ORDERS, start=1):
                buyer = users_by_email.get(order_data["buyer"])
                if not buyer:
                    continue

                created_at = datetime.utcnow() - timedelta(days=order_data["days_ago"])
                estimated_delivery_at = created_at + timedelta(days=order_data["eta_days"])

                order = Order(
                    user_id=buyer.id,
                    idempotency_key=f"seed-order-{index}",
                    status=order_data["status"],
                    transport_service=order_data.get("transport"),
                    estimated_delivery_at=estimated_delivery_at,
                    delivery_full_name=buyer.full_name,
                    delivery_phone=buyer.phone,
                    delivery_company_name=buyer.company_name,
                    delivery_state=buyer.state,
                    delivery_city=buyer.city,
                    delivery_address=buyer.address,
                    total_amount=0,
                    created_at=created_at,
                )
                db.add(order)
                db.flush()

                total_amount = 0.0
                ordered_fabrics: list[str] = []

                for sku, quantity in order_data["items"].items():
                    product = products_by_sku.get(sku)
                    if not product:
                        continue

                    product.inventory_quantity = max(0, int(product.inventory_quantity) - int(quantity))
                    line_total = float(product.base_price) * int(quantity)
                    total_amount += line_total

                    if product.fabric:
                        ordered_fabrics.extend([product.fabric] * int(quantity))

                    db.add(
                        OrderItem(
                            order_id=order.id,
                            product_id=product.id,
                            quantity=int(quantity),
                            unit_price=float(product.base_price),
                            cost_price=float(product.cost_price),
                        )
                    )

                order.total_amount = total_amount
                buyer.total_orders = int(buyer.total_orders or 0) + 1
                buyer.total_spend = float(buyer.total_spend or 0) + total_amount
                buyer.average_spend = (
                    float(buyer.total_spend) / int(buyer.total_orders) if int(buyer.total_orders or 0) else 0
                )
                buyer.order_preferences = _merge_order_preferences(buyer.order_preferences, ordered_fabrics)

            db.commit()

        print("✓ Seed complete: admin, products, fake users, and sample orders ready.")
        print("\nTest Accounts:")
        print(f"  - Admin: {admin_email} / {admin_password}")
        print("  - Consumers: retail.anjali@example.com / retail123, retail.meera@example.com / retail123")
        print("  - Wholesalers: wholesale.kapoor@example.com / wholesale123, wholesale.southloom@example.com / wholesale123")
        print("  - Transport: transit.fastlane@example.com / transport123, transit.northexpress@example.com / transport123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
