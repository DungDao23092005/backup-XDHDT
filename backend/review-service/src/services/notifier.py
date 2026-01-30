import os
import requests
import logging

# Lấy cấu hình URL từ biến môi trường (Docker Compose đã config)
NOTI_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8000")

logger = logging.getLogger(__name__)

def send_notification_to_user(user_id: int, title: str, body: str):
    """
    Gửi request sang Notification Service để push thông báo realtime.
    Hàm này nên được gọi trong BackgroundTasks để không chặn API chính.
    """
    try:
        url = f"{NOTI_SERVICE_URL}/api/notifications/devices/test-push"
        
        params = {
            "user_id": user_id,
            "title": title,
            "body": body
        }
        
        # Timeout 5s để tránh treo tiến trình nếu Notification Service bị chậm
        response = requests.post(url, params=params, timeout=5)
        
        if response.status_code == 200:
            logger.info(f"✅ [Notification] Sent to User {user_id}: {title}")
        else:
            logger.warning(f"⚠️ [Notification] Failed (Status {response.status_code}): {response.text}")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"🔥 [Notification] Connection Error: {str(e)}")