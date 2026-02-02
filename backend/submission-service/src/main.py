import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator 

# Import 2 client để bắn tin nhắn
from src.rabbitmq_client import publish_message as send_email_task
from src.kafka_client import log_activity

from .database import engine, Base
from .routers import submissions
from .config import settings

# Tạo bảng Database nếu chưa có
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UTH Conference Submission Service",
    root_path="/submission"
)

# Cấu hình CORS (Để Frontend React gọi được)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kích hoạt Monitoring (Grafana/Prometheus)
Instrumentator().instrument(app).expose(app)

# ---------------------------------------------
# Cấu hình thư mục chứa file PDF upload
if not os.path.exists(settings.UPLOAD_DIR):
    os.makedirs(settings.UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Đăng ký các Router xử lý logic chính
app.include_router(submissions.router)

# ---------------------------------------------
# CÁC API CƠ BẢN & TEST HỆ THỐNG
# ---------------------------------------------

@app.get("/")
def root():
    return {"message": "Submission Service is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "submission-service"}

@app.post("/test-trigger")
def test_integration():
    """
    API này dùng để TEST: Bắn tin nhắn vào cả RabbitMQ và Kafka cùng lúc.
    Giúp kiểm tra xem 2 Worker có hoạt động song song không.
    """
    # 1. Gửi việc cho RabbitMQ (Gửi Email)
    email_payload = {
        "receiver_email": "qwer2309200c@gmail.com", # Email của bạn
        "subject": "TEST TOAN HE THONG",
        "body": "Chuc mung! RabbitMQ da gui mail thanh cong."
    }
    send_email_task(email_payload)

    # 2. Gửi việc cho Kafka (Ghi Log)
    log_activity("TEST_API", "User vua goi API /test-trigger de kiem tra he thong")

    return {
        "message": "Đã gửi tín hiệu đi thành công!",
        "rabbitmq": "Sent email task",
        "kafka": "Sent log event"
    }