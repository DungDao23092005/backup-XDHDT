import sys
import os
from sqlalchemy import text

# Thêm thư mục hiện tại vào path để Python tìm thấy module 'src'
sys.path.append(os.getcwd())

try:
    print("⏳ Đang đọc cấu hình và kết nối Database...")
    from src.database import engine, SessionLocal
    from src.models import Base
    
    # 1. Test kết nối
    db = SessionLocal()
    # Chạy câu lệnh SQL đơn giản nhất để xem có ping được MySQL không
    db.execute(text("SELECT 1"))
    print("✅ Bước 1: Kết nối MySQL THÀNH CÔNG!")
    
    # 2. Test tạo bảng (Models)
    print("⏳ Đang yêu cầu tạo bảng từ Models...")
    Base.metadata.create_all(bind=engine)
    print("✅ Bước 2: Tạo bảng (Tables) THÀNH CÔNG!")
    
    # Kiểm tra xem bảng đã thực sự được tạo chưa
    result = db.execute(text("SHOW TABLES;"))
    tables = [row[0] for row in result]
    print(f"📊 Danh sách bảng hiện có trong DB: {tables}")
    
    if "papers" in tables and "paper_versions" in tables:
        print("\n🎉 CHÚC MỪNG! Cấu hình 3 file của bạn HOÀN HẢO.")
    else:
        print("\n⚠️ Cảnh báo: Không thấy bảng 'papers'. Kiểm tra lại file src/models.py")

    db.close()

except ModuleNotFoundError as e:
    print(f"\n❌ Lỗi Import: {e}")
    print("👉 Hãy chắc chắn bạn đang đứng ở thư mục 'submission-service' khi chạy lệnh.")
except Exception as e:
    print(f"\n❌ Lỗi Kết nối/Cấu hình: {e}")
    print("👉 Gợi ý kiểm tra:")
    print("   1. Docker MySQL đã chạy chưa? (docker ps)")
    print("   2. File .env đã có chưa? Mật khẩu đúng không?")
    print("   3. Đã pip install pymysql chưa?")