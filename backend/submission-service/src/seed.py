import os
from datetime import datetime
from src.database import SessionLocal, engine, Base
from src.models import Paper, PaperAuthor, PaperVersion

# Đảm bảo thư mục lưu file tồn tại
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def create_dummy_pdf(file_path):
    """Tạo một file PDF giả (thực ra là text file đổi đuôi) để test download"""
    with open(file_path, "wb") as f:
        f.write(b"%PDF-1.4\n%Dummy PDF content for testing\n")

def seed():
    print("🌱 Đang khởi tạo dữ liệu mẫu cho Submission Service...")
    
    # 1. Tạo bảng DB
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 2. Kiểm tra nếu chưa có bài báo nào thì mới tạo
    if not db.query(Paper).first():
        
        # --- Tạo Bài Báo (Conference ID = 1 => Double Blind) ---
        paper = Paper(
            title="Nghiên cứu ứng dụng Blockchain trong Quản lý Đào tạo",
            abstract="Bài báo này đề xuất mô hình lưu trữ văn bằng chứng chỉ dựa trên Blockchain...",
            conference_id=1,  # ID=1 là Conference Double-blind (theo logic mock)
            submitter_id=2,   # ID=2 giả lập là tác giả (Author User)
            status="submitted"
        )
        db.add(paper)
        db.commit()
        db.refresh(paper)

        # --- Tạo Tác Giả (Paper Authors) ---
        authors = [
            PaperAuthor(
                paper_id=paper.id,
                full_name="Nguyễn Văn A",
                email="nguyenvana@uth.edu.vn",
                organization="Khoa CNTT - ĐH GTVT",
                display_order=1
            ),
            PaperAuthor(
                paper_id=paper.id,
                full_name="Trần Thị B",
                email="tranthib@uth.edu.vn",
                organization="Viện KHCN",
                display_order=2
            )
        ]
        db.add_all(authors)

        # --- Tạo File PDF (Paper Version) ---
        file_name = f"paper_{paper.id}_v1.pdf"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        create_dummy_pdf(file_path) # Tạo file vật lý

        version = PaperVersion(
            paper_id=paper.id,
            version_number=1,
            file_path=file_path
        )
        db.add(version)
        
        db.commit()
        print(f"✅ Đã tạo bài báo mẫu ID: {paper.id} (Double-blind Conf)")
        print(f"✅ Đã tạo file giả: {file_path}")
    else:
        print("⚠️ Dữ liệu đã tồn tại, bỏ qua seed.")

    db.close()

if __name__ == "__main__":
    seed()