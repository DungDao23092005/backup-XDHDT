# src/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore", 
        case_sensitive=False,
    )

    DATABASE_URL: str = "mysql+pymysql://root:root@identity-db:3306/identity_db"
    PROJECT_NAME: str = "Identity Service"

    JWT_SECRET_KEY: str = "SECRET_KEY_CHANGE_ME"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # [NEW] Cấu hình để gọi Notification Service
    # Mặc định trỏ tới container name trong Docker, nhưng sẽ bị ghi đè bởi biến môi trường nếu có
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8000"
    INTERNAL_KEY: str = "secret_123" 

settings = Settings()