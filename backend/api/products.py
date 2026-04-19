import json
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security import get_current_user, get_current_user_optional
from db.models import Product, User
from db.session import get_db
from ml_engine.predictor import PricingFeatures, get_pricing_predictor
from vector_store.chroma_client import get_vector_client

router = APIRouter(prefix="/products", tags=["products"])
MEDIA_PRODUCTS_DIR = Path(__file__).resolve().parents[1] / "media" / "products"
MEDIA_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)


class ProductOut(BaseModel):
    id: int
    sku: str
    title: str
    fabric: str | None
    origin: str | None
    short_description: str | None
    detailed_description: str | None
    base_price: float
    cost_price: float | None = None
    cover_image: str | None
    gallery_images: list[str]
    procurement_days: str | None
    inventory_quantity: int


class ProductCreatePayload(BaseModel):
    sku: str | None = None
    title: str = Field(min_length=2)
    fabric: str | None = None
    origin: str | None = None
    short_description: str | None = None
    detailed_description: str | None = None
    base_price: float = Field(gt=0)
    cost_price: float = Field(default=0, ge=0)
    cover_image: str | None = None
    gallery_images: list[str] = []
    procurement_days: str | None = None
    inventory_quantity: int = Field(default=0, ge=0)


class ProductUpdatePayload(BaseModel):
    sku: str | None = None
    title: str | None = None
    fabric: str | None = None
    origin: str | None = None
    short_description: str | None = None
    detailed_description: str | None = None
    base_price: float | None = Field(default=None, gt=0)
    cost_price: float | None = Field(default=None, ge=0)
    cover_image: str | None = None
    gallery_images: list[str] | None = None
    procurement_days: str | None = None
    inventory_quantity: int | None = Field(default=None, ge=0)


class PriceQuotePayload(BaseModel):
    product_id: int
    order_quantity: int = Field(ge=1)
    historical_purchase_frequency: float = 0
    current_season: str = "regular"


class PriceQuoteOut(BaseModel):
    product_id: int
    base_price: float
    recommended_price: float


class ProductImageUploadOut(BaseModel):
    urls: list[str]


def _require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _safe_gallery(product: Product) -> list[str]:
    if not product.gallery_images:
        return [product.cover_image] if product.cover_image else []
    try:
        parsed = json.loads(product.gallery_images)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if str(item).strip()]
    except json.JSONDecodeError:
        pass
    return [product.cover_image] if product.cover_image else []


def _to_product_out(product: Product, *, include_cost: bool = False) -> ProductOut:
    return ProductOut(
        id=product.id,
        sku=product.sku,
        title=product.title,
        fabric=product.fabric,
        origin=product.origin,
        short_description=product.short_description,
        detailed_description=product.detailed_description,
        base_price=float(product.base_price),
        cost_price=float(product.cost_price) if include_cost else None,
        cover_image=product.cover_image,
        gallery_images=_safe_gallery(product),
        procurement_days=product.procurement_days,
        inventory_quantity=product.inventory_quantity,
    )


@router.get("", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[ProductOut]:
    products = db.query(Product).order_by(Product.id.desc()).all()
    is_admin = bool(current_user and current_user.role == "admin")
    return [_to_product_out(product, include_cost=is_admin) for product in products]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductOut:
    _require_admin(current_user)

    sku = payload.sku or f"SKU-{uuid4().hex[:8].upper()}"
    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    gallery_images = payload.gallery_images or ([payload.cover_image] if payload.cover_image else [])
    product = Product(
        sku=sku,
        title=payload.title,
        description=payload.short_description,
        fabric=payload.fabric,
        origin=payload.origin,
        short_description=payload.short_description,
        detailed_description=payload.detailed_description,
        base_price=payload.base_price,
        cost_price=payload.cost_price,
        cover_image=payload.cover_image,
        gallery_images=json.dumps(gallery_images),
        procurement_days=payload.procurement_days,
        inventory_quantity=payload.inventory_quantity,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _to_product_out(product, include_cost=True)


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductOut:
    _require_admin(current_user)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    updates = payload.model_dump(exclude_unset=True)
    if "gallery_images" in updates:
        updates["gallery_images"] = json.dumps(updates["gallery_images"] or [])

    if "short_description" in updates:
        updates["description"] = updates["short_description"]

    for key, value in updates.items():
        if value is not None or key in ["cost_price", "base_price"]:
            setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return _to_product_out(product, include_cost=True)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    _require_admin(current_user)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


@router.post("/quote", response_model=PriceQuoteOut)
def quote_price(
    payload: PriceQuotePayload,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> PriceQuoteOut:
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    tier_map = {
        "admin": 1.0,
        "wholesaler": 0.7,
        "retailer": 0.85,
        "consumer": 1.0,
        "user": 1.0,
    }

    user_tier_weight = tier_map.get(current_user.role, 1.0) if current_user else 1.0

    predictor = get_pricing_predictor()
    recommended_price = predictor.predict(
        PricingFeatures(
            base_price=float(product.base_price),
            user_tier_weight=user_tier_weight,
            order_quantity=payload.order_quantity,
            historical_purchase_frequency=payload.historical_purchase_frequency,
            current_season=payload.current_season,
        )
    )

    return PriceQuoteOut(
        product_id=product.id,
        base_price=float(product.base_price),
        recommended_price=float(recommended_price),
    )


@router.post("/upload-images", response_model=ProductImageUploadOut)
def upload_product_images(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
) -> ProductImageUploadOut:
    _require_admin(current_user)

    if not files:
        raise HTTPException(status_code=400, detail="No images provided")

    uploaded_urls: list[str] = []
    allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".avif"}

    for file in files:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"Unsupported file type for {file.filename}")

        suffix = Path(file.filename or "").suffix.lower() or ".jpg"
        if suffix not in allowed_ext:
            raise HTTPException(status_code=400, detail=f"Unsupported image extension: {suffix}")

        file_name = f"{uuid4().hex}{suffix}"
        destination = MEDIA_PRODUCTS_DIR / file_name
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        uploaded_urls.append(f"/media/products/{file_name}")

    return ProductImageUploadOut(urls=uploaded_urls)


@router.post("/{product_id}/index", status_code=202)
def index_product_description(product_id: int, db: Session = Depends(get_db)) -> dict[str, str]:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    client = get_vector_client()
    collection = client.get_or_create_collection(name="products")
    collection.upsert(
        ids=[str(product.id)],
        documents=[f"{product.title} {product.fabric or ''} {product.short_description or ''}"],
        metadatas=[{"sku": product.sku}],
    )
    return {"status": "indexed"}
