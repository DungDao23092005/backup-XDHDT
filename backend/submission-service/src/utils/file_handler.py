
# backend/submission-service/src/utils/file_handler.py
import os

UPLOAD_DIR = "uploads"

# Đảm bảo thư mục upload luôn tồn tại khi chạy app
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

def get_file_path(filename: str) -> str:
    """Trả về đường dẫn tuyệt đối hoặc tương đối tới file"""
    return os.path.join(UPLOAD_DIR, filename)

def file_exists(filename: str) -> bool:
    """Kiểm tra file có tồn tại trên ổ cứng không"""
    path = get_file_path(filename)
    return os.path.exists(path)
import os
import shutil
from fastapi import UploadFile, HTTPException

BASE_UPLOAD_DIR = "uploads"
PAPERS_DIR = os.path.join(BASE_UPLOAD_DIR, "papers")

ALLOWED_EXTENSIONS = {".pdf"}
ALLOWED_CONTENT_TYPES = {"application/pdf"}
MAX_FILE_SIZE_MB = 20

def ensure_dir(path: str) -> None:
    """Tạo thư mục nếu chưa tồn tại"""
    os.makedirs(path, exist_ok=True)


def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()


def validate_file(upload_file: UploadFile) -> None:
    
    # Đuôi file
    filename = upload_file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File extension not allowed. Must be: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    if upload_file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid content type. Must be application/pdf"
        )
    
    try:
        upload_file.file.seek(0, os.SEEK_END)
        file_size = upload_file.file.tell()
        
        upload_file.file.seek(0)

        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File size too large. Limit is {MAX_FILE_SIZE_MB}MB"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating file: {str(e)}")


def save_paper_file(
    paper_id: int, 
    version_number: int, 
    upload_file: UploadFile
) -> str:
  
    validate_file(upload_file)

    # uploads\papers\10\v1
    version_dir = os.path.join(
        PAPERS_DIR, 
        str(paper_id), 
        f"v{version_number}"
    )
    ensure_dir(version_dir)

    file_path = os.path.join(version_dir, "paper.pdf")

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    except Exception as e:
        if os.path.exists(version_dir):
            shutil.rmtree(version_dir)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    db_path = f"/papers/{paper_id}/v{version_number}/paper.pdf"
    
    return db_path


def delete_paper_version_file(
        paper_id: int, 
        version_number: int
) -> None:
    version_dir = os.path.join(
        PAPERS_DIR, str(paper_id), 
        f"v{version_number}"
    )
    if os.path.exists(version_dir):
        try:
            shutil.rmtree(version_dir)
            print(f"Rollback: Deleted directory {version_dir}")
        except Exception as e:
            print(f"Failed to delete directory {version_dir}: {e}")