from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3307/submission_db"
    NOTIFICATION_SERVICE_URL: str = "http://localhost:8001"
    REVIEW_SERVICE_URL: str       = "http://localhost:8003"
    CONFERENCE_SERVICE_URL: str   = "http://localhost:8002"
    INTELLIGENT_SERVICE_URL: str  = "http://localhost:8004"
    IDENTITY_SERVICE_URL: str     = "http://localhost:8005"

    SECRET_KEY: str = "SECRET_KEY_CHANGE_ME" 
    ALGORITHM: str = "HS256"

    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10 

    PROJECT_NAME: str = "Submission Service"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
