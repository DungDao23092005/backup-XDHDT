from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    DB_USER: str = "root"
    DB_PASSWORD: str = "root"
    DB_HOST: str = "conference-db" 
    DB_PORT: int = 3306            
    DB_NAME: str = "conference_db"

    DATABASE_URL: Optional[str] = None
    
    SUBMISSION_SERVICE_URL: str   = os.getenv("SUBMISSION_SERVICE_URL", "http://submission-service:8000")
    
    NOTIFICATION_SERVICE_URL: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000/api/notifications")
    
    REVIEW_SERVICE_URL: str       = os.getenv("REVIEW_SERVICE_URL", "http://review-service:8000")
    INTELLIGENT_SERVICE_URL: str  = os.getenv("INTELLIGENT_SERVICE_URL", "http://intelligent-service:8000")
    
    IDENTITY_SERVICE_URL: str     = os.getenv("IDENTITY_SERVICE_URL", "http://identity-service:8000/api/users")

    PROJECT_NAME: str = "Conference Service"
    SECRET_KEY: str = "secret_key_conference_service"
    
    def model_post_init(self, __context):
        if self.DATABASE_URL is None:
            self.DATABASE_URL = (
                f"mysql+pymysql://{self.DB_USER}:"
                f"{self.DB_PASSWORD}@{self.DB_HOST}:"
                f"{self.DB_PORT}/{self.DB_NAME}"
            )

    model_config = SettingsConfigDict(
        env_file=".env", 
        extra="ignore"
    )

settings = Settings()