# backend/notification-service/src/routers/fcm.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src import database, models, schemas
from src.security import deps # Giả sử bạn có module check user hiện tại (current_user)

router = APIRouter(
    prefix="/api/notifications/devices",
    tags=["FCM Devices"]
)

@router.post("/register", response_model=schemas.DeviceResponse)
def register_device(
    device: schemas.DeviceCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(deps.get_current_user) # Cần lấy ID user đang đăng nhập
):
    """
    Frontend gọi API này mỗi khi user đăng nhập hoặc refresh trang 
    để cập nhật FCM Token mới nhất.
    """
    user_id = current_user.id
    
    # Kiểm tra xem token đã tồn tại chưa
    existing_device = db.query(models.UserDevice).filter(
        models.UserDevice.fcm_token == device.fcm_token
    ).first()

    if existing_device:
        # Nếu token đã tồn tại nhưng của user khác -> Update lại user_id (trường hợp mượn máy)
        if existing_device.user_id != user_id:
            existing_device.user_id = user_id
            db.commit()
        return {"message": "Device token updated"}
    
    # Tạo mới
    new_device = models.UserDevice(
        user_id=user_id,
        fcm_token=device.fcm_token,
        device_type=device.device_type
    )
    db.add(new_device)
    db.commit()
    
    return {"message": "Device registered successfully"}

@router.delete("/unregister")
def unregister_device(
    token: str,
    db: Session = Depends(database.get_db),
    current_user = Depends(deps.get_current_user)
):
    """Xóa token khi user đăng xuất"""
    db.query(models.UserDevice).filter(
        models.UserDevice.fcm_token == token,
        models.UserDevice.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "Device unregistered"}

@router.post("/test-push")
def test_push_notification(
    user_id: int,
    title: str = "👋 Xin chào từ UTH ConfMS",
    body: str = "Đây là thông báo thử nghiệm hệ thống Web Push!",
    db: Session = Depends(database.get_db)
):
    """Gửi thông báo giả lập đến user_id cụ thể"""
    send_push_to_user(db, user_id, title, body)
    return {"message": f"Đã gửi lệnh push đến user {user_id}"}