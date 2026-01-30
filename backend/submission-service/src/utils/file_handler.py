import os
import shutil
from fastapi import UploadFile, HTTPException
from src.config import settings

# Lấy cấu hình từ config.py
BASE_UPLOAD_DIR = settings.UPLOAD_DIR
PAPERS_DIR = os.path.join(BASE_UPLOAD_DIR, "papers")

ALLOWED_EXTENSIONS = {".pdf"}
ALLOWED_CONTENT_TYPES = {"application/pdf"}

# Đảm bảo thư mục gốc tồn tại khi chạy
os.makedirs(PAPERS_DIR, exist_ok=True)

def ensure_dir(path: str) -> None:
    """Tạo thư mục nếu chưa tồn tại"""
    os.makedirs(path, exist_ok=True)

def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()

def validate_file(upload_file: UploadFile) -> None:
    # 1. Kiểm tra đuôi file
    filename = upload_file.filename or ""
    ext = get_file_extension(filename)
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File extension not allowed. Must be: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 2. Kiểm tra Content-Type
    if upload_file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid content type. Must be application/pdf"
        )
    
    # 3. Kiểm tra kích thước file
    try:
        upload_file.file.seek(0, os.SEEK_END)
        file_size = upload_file.file.tell()
        upload_file.file.seek(0) # Reset con trỏ về đầu để đọc sau này

        # Lấy giới hạn từ settings (config.py)
        limit_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        
        if file_size > limit_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File size too large. Limit is {settings.MAX_FILE_SIZE_MB}MB"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating file: {str(e)}")

def save_paper_file(
    paper_id: int, 
    version_number: int, 
    upload_file: UploadFile
) -> str:
    """
    Lưu file vào ổ cứng.
    Cấu trúc thư mục: uploads/papers/{paper_id}/v{version_number}/paper.pdf
    """
    validate_file(upload_file)

    # Tạo đường dẫn thư mục chứa phiên bản này
    version_dir = os.path.join(
        PAPERS_DIR, 
        str(paper_id), 
        f"v{version_number}"
    )
    ensure_dir(version_dir)

    # Đường dẫn file vật lý trên ổ cứng
    file_path = os.path.join(version_dir, "paper.pdf")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    except Exception as e:
        # Nếu lỗi thì dọn dẹp thư mục vừa tạo
        if os.path.exists(version_dir):
            shutil.rmtree(version_dir)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Trả về đường dẫn tương đối để lưu vào Database
    # Format: papers/10/v1/paper.pdf
    db_path = f"papers/{paper_id}/v{version_number}/paper.pdf"
    
    return db_path

def delete_paper_version_file(
        paper_id: int, 
        version_number: int
) -> None:
    """Xóa thư mục phiên bản bài báo (dùng khi rollback hoặc xóa bài)"""
    version_dir = os.path.join(
        PAPERS_DIR, str(paper_id), 
        f"v{version_number}"
    )
    if os.path.exists(version_dir):
        try:
            shutil.rmtree(version_dir)
            print(f"Deleted directory: {version_dir}")
        except Exception as e:
            print(f"Failed to delete directory {version_dir}: {e}")

def get_file_path_local(relative_path: str) -> str:
    """
    Chuyển đổi đường dẫn lưu trong DB thành đường dẫn tuyệt đối trên server.
    Dùng cho API download/xem file.
    Input: papers/10/v1/paper.pdf
    Output: /app/uploads/papers/10/v1/paper.pdf
    """
    return os.path.join(BASE_UPLOAD_DIR, relative_path)