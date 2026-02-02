import os
import requests
import logging

# Lấy cấu hình URL từ biến môi trường
NOTI_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")
# Lấy Internal Key để xác thực giữa các service (quan trọng)
INTERNAL_KEY = os.getenv("INTERNAL_KEY", "secure_internal_key") 

logger = logging.getLogger(__name__)

def send_notification_to_user(user_id: int, title: str, body: str, receiver_email: str = None):
    """
    Gửi request sang Notification Service để lưu thông báo vào Inbox + gửi Email (nếu có).
    Hàm này nên được gọi trong BackgroundTasks.
    """
    try:
        # 1. Đổi endpoint từ /devices/test-push sang /api/notifications (để lưu vào DB)
        url = f"{NOTI_SERVICE_URL}/api/notifications"
        
        # 2. Cấu trúc Payload phải khớp với schemas.NotificationRequest bên Notification Service
        payload = {
            "receiver_id": user_id,
            "subject": title,
            "body": body,
            # Nếu logic gọi hàm có truyền email thì gửi kèm, không thì thôi
            "receiver_email": receiver_email
        }
        
        # 3. Thêm Header xác thực (Internal Key)
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Key": INTERNAL_KEY
        }
        
        # Timeout 5s để tránh treo
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        
        if response.status_code in [200, 201]:
            logger.info(f"✅ [Notification] Saved to Inbox for User {user_id}: {title}")
        else:
            logger.warning(f"⚠️ [Notification] Failed to save (Status {response.status_code}): {response.text}")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"🔥 [Notification] Connection Error: {str(e)}")