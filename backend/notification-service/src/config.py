from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # =========================================================
    # 1. CẤU HÌNH DATABASE (MySQL)
    # =========================================================
    # Lưu ý: Đổi tên DB thành notification_db

    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3308/notification_db"


    # =========================================================
    # 2. CẤU HÌNH EMAIL (QUAN TRỌNG NHẤT)
    # =========================================================
    # Các thông tin này sẽ đọc từ file .env để bảo mật
    MAIL_USERNAME: str = "tungnh0801@gmail.com"
    MAIL_PASSWORD: str = "cpwj iiif hsva brph"
    MAIL_FROM: str = "tungnh0801@gmail.com"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # =========================================================
    # 3. CẤU HÌNH LIÊN KẾT (SERVICE & FRONTEND)
    # =========================================================
    # Dùng để tạo link trong email (Ví dụ: "Bấm vào đây để xem bài")
    FRONTEND_URL: str = "http://localhost:3000"

    PROJECT_NAME: str = "Notification Service"
    
    # Cấu hình bảo mật (nếu cần xác thực service gọi sang)
    SECRET_KEY: str = "SECRET_KEY_NOTIFICATION_SERVICE"
    ALGORITHM: str = "HS256"

    class Config:
        # Tự động đọc file .env (nếu có) để ghi đè các giá trị trên
        env_file = ".env"
        extra="ignore"

# Khởi tạo
settings = Settings()
