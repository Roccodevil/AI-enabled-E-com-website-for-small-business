from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.security import get_current_user
from db.models import Feedback, Order, User
from db.session import get_db

router = APIRouter(prefix="/feedback", tags=["feedback"])


class FeedbackCreatePayload(BaseModel):
    order_id: int | None = None
    category: str = Field(default="feedback", pattern="^(feedback|complaint)$")
    message: str = Field(min_length=5, max_length=2000)


class FeedbackReviewPayload(BaseModel):
    status: str = Field(default="reviewed", pattern="^(open|reviewed|resolved|rejected)$")
    admin_note: str | None = Field(default=None, max_length=2000)


class FeedbackOut(BaseModel):
    id: int
    user_id: int
    user_email: str
    order_id: int | None
    category: str
    message: str
    status: str
    admin_note: str | None
    created_at: datetime


def _to_feedback_out(feedback: Feedback) -> FeedbackOut:
    return FeedbackOut(
        id=feedback.id,
        user_id=feedback.user_id,
        user_email=feedback.user.email,
        order_id=feedback.order_id,
        category=feedback.category,
        message=feedback.message,
        status=feedback.status,
        admin_note=feedback.admin_note,
        created_at=feedback.created_at,
    )


def _ensure_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackCreatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    if current_user.role in {"admin", "transport"}:
        raise HTTPException(status_code=403, detail="Only customer accounts can create feedback")

    if payload.order_id is not None:
        order = db.query(Order).filter(Order.id == payload.order_id, Order.user_id == current_user.id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found for this user")

    item = Feedback(
        user_id=current_user.id,
        order_id=payload.order_id,
        category=payload.category,
        message=payload.message.strip(),
        status="open",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_feedback_out(item)


@router.get("/me", response_model=list[FeedbackOut])
def list_my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FeedbackOut]:
    items = db.query(Feedback).filter(Feedback.user_id == current_user.id).order_by(Feedback.created_at.desc()).all()
    return [_to_feedback_out(item) for item in items]


@router.get("", response_model=list[FeedbackOut])
def list_feedback_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FeedbackOut]:
    _ensure_admin(current_user)
    items = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    return [_to_feedback_out(item) for item in items]


@router.patch("/{feedback_id}", response_model=FeedbackOut)
def review_feedback(
    feedback_id: int,
    payload: FeedbackReviewPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    _ensure_admin(current_user)

    item = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")

    item.status = payload.status
    item.admin_note = payload.admin_note.strip() if payload.admin_note else None
    db.commit()
    db.refresh(item)
    return _to_feedback_out(item)
