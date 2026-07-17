import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/asalahub"
    ALLOWED_HOSTS: str = "http://localhost:3000"
    JWT_SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-DEFAULT-SECRET-KEY"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
