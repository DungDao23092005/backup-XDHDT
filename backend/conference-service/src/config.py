from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Các biến mặc định (dùng khi chạy Local)
    DB_USER: str = "root"
    DB_PASSWORD: str = "root"
    DB_HOST: str = "localhost"
    DB_PORT: int = 3309
    DB_NAME: str = "conference_db"

    # --- SỬA ĐỔI QUAN TRỌNG Ở ĐÂY ---
    # 1. Khai báo DATABASE_URL là một BIẾN (Field), không phải hàm @property
    # Để Pydantic có thể nạp giá trị từ Docker vào đây.
    DATABASE_URL: Optional[str] = None

    SUBMISSION_SERVICE_URL: str   = "http://localhost:8000"
    NOTIFICATION_SERVICE_URL: str = "http://localhost:8001"
    REVIEW_SERVICE_URL: str       = "http://localhost:8003"
    INTELLIGENT_SERVICE_URL: str  = "http://localhost:8004"
    IDENTITY_SERVICE_URL: str     = "http://localhost:8005"

    PROJECT_NAME: str = "Conference Service"
    SECRET_KEY: str = "secret_key_conference_service"
    
    # 2. Hàm này tự động chạy sau khi class khởi tạo
    # Nếu không có biến môi trường (chạy local), nó mới tự tính toán.
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