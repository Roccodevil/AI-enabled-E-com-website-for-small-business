from datetime import datetime, timedelta
import hashlib
import secrets
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.config import settings
from core.security import create_access_token, get_current_user, hash_password, verify_password
from db.models import EmailOtpCode, User
from db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterPayload(BaseModel):
    email: str
    password: str = Field(min_length=8)
    full_name: str | None = None


class LoginPayload(BaseModel):
    email: str
    password: str


class EmailOtpRequestPayload(BaseModel):
    email: str


class EmailOtpVerifyPayload(BaseModel):
    email: str
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=8)
    full_name: str | None = None


class EmailOtpRequestResponse(BaseModel):
    message: str
    dev_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str | None = None


class UserProfileOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    phone: str | None
    company_name: str | None
    state: str | None
    city: str | None
    address: str | None
    order_preferences: str | None
    total_orders: int
    total_spend: float
    average_spend: float
    role: str
    is_active: bool


class UserProfileUpdatePayload(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    company_name: str | None = None
    state: str | None = None
    city: str | None = None
    address: str | None = None
    order_preferences: str | None = None


class TransportCreatePayload(BaseModel):
    email: str
    password: str = Field(min_length=8)
    full_name: str | None = None


class UserInsightOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    total_orders: int
    total_spend: float
    average_spend: float
    order_preferences: str | None
    is_active: bool


def _to_profile(user: User) -> UserProfileOut:
    return UserProfileOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        company_name=user.company_name,
        state=user.state,
        city=user.city,
        address=user.address,
        order_preferences=user.order_preferences,
        total_orders=user.total_orders,
        total_spend=float(user.total_spend),
        average_spend=float(user.average_spend),
        role=user.role,
        is_active=user.is_active,
    )


def _require_admin(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _hash_otp(email: str, code: str) -> str:
    material = f"{email.lower().strip()}:{code}:{settings.jwt_secret_key}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def _send_otp_email(email: str, code: str) -> None:
    if not settings.smtp_host or not settings.smtp_from_email:
        print(f"[OTP] SMTP is not configured. {email} -> {code}")
        return

    if "@" not in settings.smtp_from_email:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP_FROM_EMAIL must be a valid email address",
        )

    if settings.smtp_username and "@" not in settings.smtp_username:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SMTP_USERNAME must be the full email address for Gmail/most providers",
        )

    message = EmailMessage()
    message["Subject"] = "Your SilkRoute verification code"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        f"Your verification code is {code}. It expires in {settings.otp_expire_minutes} minutes."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        try:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
        except smtplib.SMTPAuthenticationError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "SMTP authentication failed. For Gmail, use SMTP_USERNAME as your full email "
                    "address and SMTP_PASSWORD as a Google App Password with 2-step verification enabled."
                ),
            ) from exc
        except smtplib.SMTPException as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="SMTP delivery failed. Check SMTP host, port, TLS, username, and password.",
            ) from exc


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterPayload, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="consumer",
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=token, role=user.role, email=user.email)


@router.post("/email-otp/request", response_model=EmailOtpRequestResponse)
def request_email_otp(payload: EmailOtpRequestPayload, db: Session = Depends(get_db)) -> EmailOtpRequestResponse:
    email = payload.email.lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_count = (
        db.query(EmailOtpCode)
        .filter(EmailOtpCode.email == email, EmailOtpCode.created_at >= one_hour_ago)
        .count()
    )
    if recent_count >= settings.otp_max_attempts_per_hour:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try again later")

    db.query(EmailOtpCode).filter(EmailOtpCode.email == email, EmailOtpCode.consumed_at.is_(None)).delete()

    code = f"{secrets.randbelow(1000000):06d}"
    otp_entry = EmailOtpCode(
        email=email,
        code_hash=_hash_otp(email, code),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes),
    )
    db.add(otp_entry)
    db.commit()

    _send_otp_email(email, code)
    return EmailOtpRequestResponse(
        message="Verification code sent",
        dev_code=code if settings.otp_dev_mode else None,
    )


@router.post("/email-otp/verify", response_model=TokenResponse)
def verify_email_otp(payload: EmailOtpVerifyPayload, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.lower().strip()
    code = payload.code.strip()
    password = payload.password.strip()

    otp_entry = (
        db.query(EmailOtpCode)
        .filter(EmailOtpCode.email == email, EmailOtpCode.consumed_at.is_(None))
        .order_by(EmailOtpCode.created_at.desc())
        .first()
    )
    if not otp_entry:
        raise HTTPException(status_code=400, detail="OTP not found. Request a new code")

    if otp_entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired. Request a new code")

    if otp_entry.code_hash != _hash_otp(email, code):
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    otp_entry.consumed_at = datetime.utcnow()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=hash_password(password),
            role="consumer",
            full_name=payload.full_name,
            is_active=True,
        )
        db.add(user)
        db.flush()
    else:
        user.password_hash = hash_password(password)
        if payload.full_name and not user.full_name:
            user.full_name = payload.full_name

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    db.commit()
    db.refresh(user)

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=token, role=user.role, email=user.email)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginPayload, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return TokenResponse(access_token=token, role=user.role, email=user.email)


@router.get("/me", response_model=UserProfileOut)
def get_my_profile(current_user: User = Depends(get_current_user)) -> UserProfileOut:
    return _to_profile(current_user)


@router.patch("/me", response_model=UserProfileOut)
def update_my_profile(
    payload: UserProfileUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileOut:
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return _to_profile(current_user)


@router.get("/transports", response_model=list[UserProfileOut])
def list_active_transport_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserProfileOut]:
    _require_admin(current_user)
    transport_users = (
        db.query(User)
        .filter(User.role == "transport", User.is_active.is_(True))
        .order_by(User.created_at.desc())
        .all()
    )
    return [_to_profile(user) for user in transport_users]


@router.post("/transports", response_model=UserProfileOut, status_code=status.HTTP_201_CREATED)
def create_transport_user(
    payload: TransportCreatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserProfileOut:
    _require_admin(current_user)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    transport_user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="transport",
        full_name=payload.full_name,
        is_active=True,
    )
    db.add(transport_user)
    db.commit()
    db.refresh(transport_user)
    return _to_profile(transport_user)


@router.get("/users/insights", response_model=list[UserInsightOut])
def get_user_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserInsightOut]:
    _require_admin(current_user)

    users = (
        db.query(User)
        .filter(User.role.in_(["consumer", "user", "retailer", "wholesaler"]))
        .order_by(User.total_spend.desc(), User.created_at.desc())
        .all()
    )
    return [
        UserInsightOut(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            total_orders=user.total_orders,
            total_spend=float(user.total_spend),
            average_spend=float(user.average_spend),
            order_preferences=user.order_preferences,
            is_active=user.is_active,
        )
        for user in users
    ]
