import firebase_admin
from firebase_admin import messaging
from sqlalchemy.orm import Session
from src import models

def send_push_to_user(db: Session, user_id: int, title: str, body: str, data: dict = None):
    """
    Gửi thông báo đẩy đến tất cả thiết bị của một user_id
    """
    # 1. Lấy danh sách token của user
    devices = db.query(models.UserDevice).filter(models.UserDevice.user_id == user_id).all()
    
    if not devices:
        print(f"User {user_id} has no registered devices.")
        return

    tokens = [d.fcm_token for d in devices]
    
    # 2. Tạo message
    # Lưu ý: Web Push đôi khi cần config riêng, nhưng notification cơ bản thì dùng chung được
    message = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {}, # Dữ liệu kèm theo (ví dụ: link để click vào)
        tokens=tokens,
    )

    # 3. Gửi
    try:
        response = messaging.send_multicast(message)
        print(f"Successfully sent message to {response.success_count} devices.")
        
        # (Tùy chọn) Xóa các token lỗi/hết hạn nếu cần thiết dựa trên response.failure_count
    except Exception as e:
        print(f"Error sending FCM: {e}")