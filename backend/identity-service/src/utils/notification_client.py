import httpx
from src.config import settings

# [FIX] Phải thêm tham số 'receiver_id: int' vào trong ngoặc
async def send_email_via_notification_service(to_email: str, subject: str, content: str, receiver_id: int):
    """
    Hàm này sẽ gửi HTTP POST sang Notification Service
    """
    url = f"{settings.NOTIFICATION_SERVICE_URL}/api/notifications"
    
    payload = {
        "receiver_id": receiver_id, # Bây giờ biến này mới có giá trị để dùng
        "receiver_email": to_email,
        "subject": subject,
        "body": content,
        "receiver_name": "Người dùng"
    }

    headers = {
        "Content-Type": "application/json",
        "X-Internal-Key": settings.INTERNAL_KEY 
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code == 201:
                print(f"✅ [Identity -> Notification] Gửi mail thành công tới {to_email}")
            else:
                print(f"❌ [Identity -> Notification] Lỗi: {response.text}")
                
    except Exception as e:
        print(f"❌ [Identity -> Notification] Không thể kết nối tới Notification Service: {str(e)}")