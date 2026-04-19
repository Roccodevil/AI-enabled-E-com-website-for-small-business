from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core.security import get_current_user
from db.models import Order, OrderItem, Product, User
from db.session import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


class OrderItemPayload(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class CreateOrderPayload(BaseModel):
    items: list[OrderItemPayload]


class OrderResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_role: str
    delivery_full_name: str | None = None
    delivery_phone: str | None = None
    delivery_company_name: str | None = None
    delivery_state: str | None = None
    delivery_city: str | None = None
    delivery_address: str | None = None
    status: str
    transport_service: str | None
    estimated_delivery_at: datetime | None
    total_amount: float
    created_at: datetime


class OrderItemOut(BaseModel):
    product_id: int
    product_title: str
    quantity: int
    unit_price: float
    cost_price: float | None = None


class OrderDetailResponse(OrderResponse):
    items: list[OrderItemOut]


class AssignTransportPayload(BaseModel):
    transport_service: str = Field(min_length=2)
    status: str = Field(default="dispatched", min_length=2)
    estimated_delivery_at: datetime | None = None


class TransportStatusPayload(BaseModel):
    status: str = Field(min_length=2)
    estimated_delivery_at: datetime | None = None


def _ensure_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def _ensure_transport_user(current_user: User) -> None:
    if current_user.role != "transport":
        raise HTTPException(status_code=403, detail="Transport access required")


def _to_order_detail(order: Order, *, include_cost: bool = False) -> OrderDetailResponse:
    return OrderDetailResponse(
        id=order.id,
        user_id=order.user_id,
        user_email=order.user.email,
        user_role=order.user.role,
        delivery_full_name=order.delivery_full_name,
        delivery_phone=order.delivery_phone,
        delivery_company_name=order.delivery_company_name,
        delivery_state=order.delivery_state,
        delivery_city=order.delivery_city,
        delivery_address=order.delivery_address,
        status=order.status,
        transport_service=order.transport_service,
        estimated_delivery_at=order.estimated_delivery_at,
        total_amount=float(order.total_amount),
        created_at=order.created_at,
        items=[
            OrderItemOut(
                product_id=item.product_id,
                product_title=item.product.title,
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                cost_price=float(item.cost_price) if include_cost else None,
            )
            for item in order.items
        ],
    )


def _merge_order_preferences(existing: str | None, ordered_fabrics: list[str]) -> str | None:
    if not ordered_fabrics:
        return existing

    existing_list = [item.strip() for item in (existing or "").split(",") if item.strip()]
    existing_counter = Counter(existing_list)
    for fabric in ordered_fabrics:
        cleaned = fabric.strip()
        if cleaned:
            existing_counter[cleaned] += 1

    top_preferences = [name for name, _count in existing_counter.most_common(5)]
    return ", ".join(top_preferences) if top_preferences else None


@router.post("", response_model=OrderDetailResponse, status_code=201)
def create_order(
    payload: CreateOrderPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderDetailResponse:
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    idempotency_key = request.headers.get("Idempotency-Key", "").strip() or None
    if idempotency_key:
        existing_order = (
            db.query(Order)
            .filter(Order.user_id == current_user.id, Order.idempotency_key == idempotency_key)
            .first()
        )
        if existing_order:
            return _to_order_detail(existing_order, include_cost=current_user.role == "admin")

    total_amount = 0.0
    try:
        order = Order(
            user_id=current_user.id,
            idempotency_key=idempotency_key,
            status="created",
            total_amount=0,
            delivery_full_name=current_user.full_name,
            delivery_phone=current_user.phone,
            delivery_company_name=current_user.company_name,
            delivery_state=current_user.state,
            delivery_city=current_user.city,
            delivery_address=current_user.address,
        )
        db.add(order)
        db.flush()
        ordered_fabrics: list[str] = []

        for item in payload.items:
            product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            if product.inventory_quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient inventory for {product.title}. Available: {product.inventory_quantity}",
                )

            line_total = float(product.base_price) * item.quantity
            total_amount += line_total
            product.inventory_quantity -= item.quantity
            if product.fabric:
                ordered_fabrics.extend([product.fabric] * item.quantity)

            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=item.quantity,
                    unit_price=product.base_price,
                    cost_price=product.cost_price,
                )
            )

        order.total_amount = total_amount
        current_user.total_orders = (current_user.total_orders or 0) + 1
        current_user.total_spend = float(current_user.total_spend or 0) + total_amount
        current_user.average_spend = (
            float(current_user.total_spend) / current_user.total_orders if current_user.total_orders else 0
        )
        current_user.order_preferences = _merge_order_preferences(current_user.order_preferences, ordered_fabrics)

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        if idempotency_key:
            existing_order = (
                db.query(Order)
                .filter(Order.user_id == current_user.id, Order.idempotency_key == idempotency_key)
                .first()
            )
            if existing_order:
                return _to_order_detail(existing_order, include_cost=current_user.role == "admin")
        raise HTTPException(status_code=409, detail="Order already submitted. Please refresh the page.")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create order") from exc

    db.refresh(order)

    return _to_order_detail(order, include_cost=current_user.role == "admin")


@router.get("", response_model=list[OrderDetailResponse])
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[OrderDetailResponse]:
    if current_user.role == "admin":
        orders = db.query(Order).order_by(Order.created_at.desc()).all()
        return [_to_order_detail(order, include_cost=True) for order in orders]

    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    return [_to_order_detail(order) for order in orders]


@router.patch("/{order_id}/assign-transport", response_model=OrderDetailResponse)
def assign_transport_service(
    order_id: int,
    payload: AssignTransportPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderDetailResponse:
    _ensure_admin(current_user)

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.transport_service = payload.transport_service.strip()
    order.status = payload.status.strip().lower().replace(" ", "_")
    order.estimated_delivery_at = payload.estimated_delivery_at
    db.commit()
    db.refresh(order)
    return _to_order_detail(order, include_cost=True)


@router.get("/transport/assigned", response_model=list[OrderDetailResponse])
def list_transport_assigned_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[OrderDetailResponse]:
    _ensure_transport_user(current_user)

    orders = (
        db.query(Order)
        .filter(Order.transport_service.ilike(current_user.email))
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_to_order_detail(order) for order in orders]


@router.patch("/{order_id}/transport-status", response_model=OrderDetailResponse)
def update_transport_status(
    order_id: int,
    payload: TransportStatusPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderDetailResponse:
    _ensure_transport_user(current_user)

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order.transport_service or order.transport_service.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="Order is not assigned to your transport account")

    next_status = payload.status.strip().lower().replace(" ", "_")
    allowed_status = {"dispatched", "in_transit", "out_for_delivery", "delivered", "failed_delivery"}
    if next_status not in allowed_status:
        raise HTTPException(status_code=400, detail="Invalid transport status")

    order.status = next_status
    if payload.estimated_delivery_at is not None:
        order.estimated_delivery_at = payload.estimated_delivery_at
    db.commit()
    db.refresh(order)
    return _to_order_detail(order)
