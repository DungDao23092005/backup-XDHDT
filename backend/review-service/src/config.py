from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3311/review_db"
    SUBMISSION_SERVICE_URL: str   = "http://localhost:8000"
    NOTIFICATION_SERVICE_URL: str = "http://localhost:8001"
    CONFERENCE_SERVICE_URL: str   = "http://localhost:8002"
    INTELLIGENT_SERVICE_URL: str  = "http://localhost:8004"
    IDENTITY_SERVICE_URL: str     = "http://localhost:8005"

    PROJECT_NAME: str = "Review Service"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

SUBMISSION_SERVICE_URL = settings.SUBMISSION_SERVICE_URL
