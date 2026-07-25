"""
Configuration Module.

Defines the environment variable mappings, database connection pooling configurations,
and security variables used across the application via Pydantic settings.
"""

import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and an optional .env file.
    """
    # Database URL configuration
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/asalahub"
    
    # CORS hosts configuration (comma-separated URLs)
    ALLOWED_HOSTS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # JWT security parameters
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-DEFAULT-SECRET-KEY"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database Performance configurations
    ECHO_SQL: bool = False
    POOL_SIZE: int = 20
    MAX_OVERFLOW: int = 10
    POOL_RECYCLE: int = 1800
    POOL_TIMEOUT: int = 30

    # Cookie configuration parameters
    COOKIE_MAX_AGE: int = 86400 * 7  # 7 days
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    class Config:
        """Pydantic configuration settings."""
        env_file = ".env"
        extra = "ignore"

# Global settings instance
settings = Settings()


