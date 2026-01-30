# backend/notification-service/src/services/notification_service.py

from sqlalchemy.orm import Session
from firebase_admin import messaging
from src import models

def send_push_to_user(db: Session, user_id: int, title: str, body: str):
    # 1. Lấy tất cả token của user đó từ DB
    devices = db.query(models.UserDevice).filter(
        models.UserDevice.user_id == user_id
    ).all()

    if not devices:
        print(f"User {user_id} không có thiết bị nào đăng ký FCM.")
        return {"success": 0, "failure": 0}

    # 2. Gom danh sách token (loại bỏ trùng lặp nếu có)
    tokens = list(set([d.fcm_token for d in devices if d.fcm_token]))

    if not tokens:
        return {"success": 0, "failure": 0}

    print(f"📤 Đang gửi thông báo tới {len(tokens)} thiết bị của User {user_id}...")

    # 3. Tạo danh sách các Message riêng lẻ (Chuẩn HTTP v1 mới)
    messages = []
    for token in tokens:
        msg = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=token
        )
        messages.append(msg)

    # 4. Gửi bằng hàm send_each (Thay thế cho send_multicast cũ)
    try:
        batch_response = messaging.send_each(messages)
        
        success_count = batch_response.success_count
        failure_count = batch_response.failure_count
        
        print(f"✅ Kết quả: {success_count} thành công, {failure_count} thất bại")

        # 5. Xử lý token lỗi (Dọn dẹp DB)
        if failure_count > 0:
            failed_tokens = []
            for idx, resp in enumerate(batch_response.responses):
                if not resp.success:
                    # Lấy token tương ứng với response lỗi
                    bad_token = tokens[idx]
                    print(f"⚠️ Lỗi gửi tới token {bad_token[:10]}...: {resp.exception}")
                    failed_tokens.append(bad_token)
            
            # Xóa token chết khỏi DB
            if failed_tokens:
                db.query(models.UserDevice).filter(
                    models.UserDevice.fcm_token.in_(failed_tokens)
                ).delete(synchronize_session=False)
                db.commit()
                print(f"🗑️ Đã xóa {len(failed_tokens)} token không hợp lệ.")

        return {"success": success_count, "failure": failure_count}
        
    except Exception as e:
        print(f"🔥 Lỗi nghiêm trọng khi gửi FCM: {e}")
        # Không raise lỗi để tránh 500 Server Error, chỉ log lại
        return {"error": str(e)}