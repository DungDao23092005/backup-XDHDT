import httpx
import logging
from ..config import settings

# Giả sử URL của notification service. Bạn có thể đưa vào file config/env
NOTIFICATION_SERVICE_URL = "http://notification-service:8000/api/v1/notifications/internal"

logger = logging.getLogger(__name__)

async def send_notification(user_id: int, subject: str, body: str, paper_id: int = None):
    """
    Gửi request tạo thông báo sang Notification Service
    """
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "recipient_id": user_id,
                "subject": subject,
                "body": body,
                "paper_id": paper_id,
                "is_read": False
                # Thêm các field khác nếu Notification Schema yêu cầu
            }
            
            # Gọi API tạo thông báo (Internal API - cần đảm bảo endpoint này tồn tại ở Notification Service)
            # Nếu endpoint của bạn là /api/v1/notifications/ thì dùng cái đó
            response = await client.post(f"{NOTIFICATION_SERVICE_URL}", json=payload)
            
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to send notification: {response.text}")
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")