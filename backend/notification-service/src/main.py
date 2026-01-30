# backend/notification-service/src/main.py
import os
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI

from src.database import engine
from src import models
from src.routers import notifications, prefs, fcm  # [MỚI] Import fcm

# --- KHỞI TẠO FIREBASE ADMIN SDK ---
try:
    # Lấy đường dẫn tuyệt đối đến file serviceAccountKey.json nằm cùng thư mục với main.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    service_account_path = os.path.join(current_dir, "serviceAccountKey.json")
    
    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        # Kiểm tra xem app đã được init chưa để tránh lỗi ValueError
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        print(f"--- Notification Service: Firebase Admin Initialized using {service_account_path} ---")
    else:
         print(f"!!! WARNING: File serviceAccountKey.json NOT FOUND at {service_account_path}")
         print("!!! Web Push Notifications will NOT work.")

except Exception as e:
    print(f"!!! WARNING: Could not initialize Firebase in Notification Service: {e}")
# -----------------------------------

# Tạo các bảng trong DB (bao gồm cả bảng UserDevice mới thêm)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UTH Conference Notification Service",
    description="Microservice chuyên xử lý thông báo và email",
    version="1.0.0"
)

# Đăng ký các Router
app.include_router(notifications.router)
app.include_router(prefs.router)
app.include_router(fcm.router) # [MỚI] API quản lý thiết bị Push Notification

@app.get("/")
def root():
    return {"message": "Notification Service is running..."}