import os
import firebase_admin
from firebase_admin import credentials
from fastapi import FastAPI
from dotenv import load_dotenv

# Import các module nội bộ
from src import models
from src.database import engine
from src.routers import notifications, prefs, fcm

# Load biến môi trường từ .env
load_dotenv()

app = FastAPI(
    title="UTH Conference Notification Service",
    description="Microservice chuyên xử lý thông báo và email",
    version="1.0.0"
)

# --- KHỞI TẠO FIREBASE ADMIN SDK ---
def init_firebase():
    try:
        # 1. Lấy đường dẫn từ .env (Ưu tiên số 1)
        # Giá trị mặc định là "serviceAccountKey.json" nếu không tìm thấy biến env
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
        
        print(f"🔍 [Firebase Init] Đang tìm key tại: {cred_path}")

        # 2. Kiểm tra file có tồn tại không
        if not os.path.exists(cred_path):
            print(f"❌ [Firebase Init] KHÔNG TÌM THẤY FILE tại: {cred_path}")
            print("!!! Web Push Notifications sẽ KHÔNG hoạt động.")
            return

        # 3. Khởi tạo App (Tránh lỗi ValueError nếu init rồi)
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print(f"✅ [Firebase Init] Thành công! Đã nạp key từ {cred_path}")
        else:
            print("ℹ️ [Firebase Init] App đã được khởi tạo trước đó.")

    except Exception as e:
        print(f"🔥 [Firebase Init] Lỗi ngoại lệ: {str(e)}")

# Gọi hàm khởi tạo ngay
init_firebase()
# -----------------------------------

# Tạo các bảng trong DB
models.Base.metadata.create_all(bind=engine)

# Đăng ký các Router
app.include_router(notifications.router)
app.include_router(prefs.router)
app.include_router(fcm.router)

@app.get("/")
def root():
    return {"message": "Notification Service is running..."}