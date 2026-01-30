from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# Import các module nội bộ
from src import database, models, schemas
from src.security import deps 

# 👇 QUAN TRỌNG: Import hàm xử lý gửi thông báo từ Service
# (Nếu bạn lưu file này ở chỗ khác, hãy sửa đường dẫn import cho đúng)
from src.services.notification_service import send_push_to_user

router = APIRouter(
    prefix="/api/notifications/devices",
    tags=["FCM Devices"]
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_device(
    device: schemas.DeviceCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Đăng ký hoặc cập nhật FCM Token cho user hiện tại.
    """
    user_id = current_user.id
    
    # 1. Tìm xem token này đã tồn tại trong DB chưa
    existing_device = db.query(models.UserDevice).filter(
        models.UserDevice.fcm_token == device.fcm_token
    ).first()

    if existing_device:
        # Nếu token đã tồn tại
        if existing_device.user_id != user_id:
            # Token này trước đó của người khác (ví dụ: đăng nhập máy công cộng)
            # -> Cập nhật lại chủ sở hữu mới
            existing_device.user_id = user_id
            db.commit()
            return {"message": "Device token updated to new user"}
        
        # Nếu đã đúng user rồi thì không làm gì cả
        return {"message": "Device token already exists"}
    
    # 2. Nếu chưa có -> Tạo mới
    new_device = models.UserDevice(
        user_id=user_id,
        fcm_token=device.fcm_token,
        device_type=device.device_type
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    
    return {"message": "Device registered successfully"}

@router.delete("/unregister")
def unregister_device(
    token: str,
    db: Session = Depends(database.get_db),
    current_user = Depends(deps.get_current_user)
):
    """
    Xóa token khi user đăng xuất (Logout) để tránh gửi nhầm thông báo.
    """
    deleted_count = db.query(models.UserDevice).filter(
        models.UserDevice.fcm_token == token,
        models.UserDevice.user_id == current_user.id
    ).delete()
    
    db.commit()
    
    if deleted_count == 0:
        return {"message": "Token not found or does not belong to user"}
        
    return {"message": "Device unregistered successfully"}

@router.post("/test-push")
def test_push_notification(
    user_id: int,
    title: str = "👋 Xin chào từ UTH ConfMS",
    body: str = "Đây là thông báo thử nghiệm hệ thống Web Push!",
    db: Session = Depends(database.get_db)
):
    """
    API test dành cho Dev/Admin để bắn thử thông báo tới 1 user cụ thể.
    """
    try:
        # Gọi hàm service đã import ở trên
        result = send_push_to_user(db, user_id, title, body)
        return {
            "message": f"Đã gửi lệnh push đến user {user_id}",
            "details": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi gửi thông báo: {str(e)}"
        )