"""
Configuration Module.

Defines the environment variable mappings, database connection pooling configurations,
and security variables used across the application via Pydantic settings.
"""

import os
from pydantic_settings import BaseSettings

from typing import Literal

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and an optional .env file.
    """
    # Environment mode: 'development', 'staging', or 'production'
    ENVIRONMENT: str = "development"

    # Database URL configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/asalahub"
    
    # CORS hosts configuration (comma-separated URLs)
    ALLOWED_HOSTS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # JWT security parameters
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-DEFAULT-SECRET-KEY"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes short-lived access token
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # 7 days long-lived refresh token


    # Database Performance configurations
    ECHO_SQL: bool = False
    POOL_SIZE: int = 20
    MAX_OVERFLOW: int = 10
    POOL_RECYCLE: int = 1800
    POOL_TIMEOUT: int = 30
    POOL_PRE_PING: bool = True

    # Cookie configuration parameters
    COOKIE_MAX_AGE: int = 86400 * 7  # 7 days
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"

    # Campus Node Deployment Configurations
    CAMPUS_MODE: bool = False
    CLOUD_SYNC_ENDPOINT: str = "http://localhost:8000/sync"
    CAMPUS_SERVICE_ACCOUNT_TOKEN: str = ""
    CAMPUS_SYNC_INTERVAL_SECONDS: int = 30
    CAMPUS_SYNC_BATCH_SIZE: int = 50
    CAMPUS_SYNC_MAX_RETRIES: int = 3

    # Media Storage & Transcoding Configurations
    MEDIA_UPLOAD_DIR: str = "uploads"
    MEDIA_STORAGE_BACKEND: str = "local"

    # Backup & Disaster Recovery Configurations
    BACKUP_STATUS_FILE: str = "backups/last_backup_status.json"





    @property
    def is_production(self) -> bool:
        """Return True if running in production environment."""
        return self.ENVIRONMENT.lower() in ("production", "prod")

    @property
    def normalized_database_url(self) -> str:
        """Ensure Postgres database URL uses postgresql:// scheme compatible with SQLAlchemy 2.0."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def effective_cookie_secure(self) -> bool:
        """Enforce Secure cookies in production unless explicitly configured otherwise."""
        if self.is_production and not self.COOKIE_SECURE:
            return True
        return self.COOKIE_SECURE

    @property
    def allowed_hosts_list(self) -> list[str]:
        """Parsed list of allowed CORS origins."""
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

# Global settings instance
settings = Settings()



