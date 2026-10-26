import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "DIGI-TRON Monitor Central Server"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # Network and Host
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    
    # Database: SQLite by default for development, PostgreSQL for enterprise production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./digitron_monitor.db")
    # For PostgreSQL in enterprise:
    # DATABASE_URL = "postgresql://digitron_user:StrongPassword2026!@localhost:5432/digitron_monitor"

    # Security & Tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "digitron_super_secret_corporate_key_change_in_production_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480 # 8 hours
    
    # Monitoring Rules
    HEARTBEAT_TIMEOUT_SECONDS: int = 90
    ALERT_CPU_THRESHOLD_PCT: float = 90.0
    ALERT_RAM_THRESHOLD_PCT: float = 90.0
    ALERT_DISK_THRESHOLD_PCT: float = 90.0
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
