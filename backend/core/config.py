import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from dotenv import load_dotenv

load_dotenv()


def _normalize_database_url(raw_url: str) -> str:
    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    is_neon_host = hostname.endswith("neon.tech")

    if is_neon_host:
        query_items = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if "sslmode" not in query_items:
            query_items["sslmode"] = "require"
            url = urlunparse(parsed._replace(query=urlencode(query_items)))

    return url


def _normalize_origin(origin: str) -> str:
    cleaned = origin.strip().strip('"').strip("'")
    return cleaned.rstrip("/")


def _parse_cors_origins(raw: str) -> list[str]:
    if raw.strip() == "*":
        return ["*"]

    origins: list[str] = []
    for part in raw.split(","):
        normalized = _normalize_origin(part)
        if normalized:
            origins.append(normalized)
    return origins


class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = _normalize_database_url(
        os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres@localhost:5432/saree_db",
        )
    )
    db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "5"))
    db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "5"))
    db_pool_recycle_seconds: int = int(os.getenv("DB_POOL_RECYCLE_SECONDS", "300"))
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "replace-this-secret")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@admin.com")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "admin123")
    otp_expire_minutes: int = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
    otp_max_attempts_per_hour: int = int(os.getenv("OTP_MAX_ATTEMPTS_PER_HOUR", "5"))
    otp_dev_mode: bool = os.getenv("OTP_DEV_MODE", "true").lower() == "true"
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", "")
    smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    chroma_persist_directory: str = os.getenv("CHROMA_PERSIST_DIRECTORY", "./vector_store/data")
    pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "")
    pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "saree-business-memory")
    pinecone_namespace: str = os.getenv("PINECONE_NAMESPACE", "admin-analytics")
    pinecone_cloud: str = os.getenv("PINECONE_CLOUD", "aws")
    pinecone_region: str = os.getenv("PINECONE_REGION", "us-east-1")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    pricing_model_path: str = os.getenv("PRICING_MODEL_PATH", "./ml_engine/pricing_model.pkl")
    cors_allow_origins: list[str] = _parse_cors_origins(
        os.getenv(
            "CORS_ALLOW_ORIGINS",
            "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173",
        )
    )
    cors_allow_origin_regex: str = _normalize_origin(os.getenv("CORS_ALLOW_ORIGIN_REGEX", ""))
    is_render: bool = os.getenv("RENDER", "").lower() == "true" or bool(os.getenv("RENDER_SERVICE_ID"))

    if (app_env.lower() == "production" or is_render) and not cors_allow_origin_regex:
        cors_allow_origin_regex = r"^https://.*\.onrender\.com$"


settings = Settings()
