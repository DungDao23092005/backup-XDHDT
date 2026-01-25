import os
from typing import List
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr, BaseModel

# --- 1. CẤU HÌNH SMTP (GMAIL) ---
conf = ConnectionConfig(
    MAIL_USERNAME = "tungnh0801@gmail.com",
    MAIL_PASSWORD = "cpwj iiif hsva brph",
    MAIL_FROM = "tungnh0801@gmail.com",
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

# --- 2. HÀM GỬI MAIL ---
async def send_submission_success_email(
    recipient_email: str,
    author_name: str,
    paper_title: str,
    paper_id: int
):

    
    # Nội dung Email (HTML)
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2 style="color: #2c3e50;">Xác nhận nộp bài thành công</h2>
        <p>Xin chào <strong>{author_name}</strong>,</p>
        
        <p>Cảm ơn bạn đã nộp bài báo khoa học đến hệ thống UTH Conference.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0;">
            <p><strong>Mã số bài báo:</strong> #{paper_id}</p>
            <p><strong>Tiêu đề:</strong> {paper_title}</p>
            <p><strong>Trạng thái:</strong> <span style="color: green;">SUBMITTED (Đã nộp)</span></p>
            <p><strong>Ngày nộp:</strong> Hôm nay</p>
        </div>
        
        <p>Ban tổ chức sẽ tiến hành phân công phản biện và thông báo kết quả sớm nhất.</p>
        <hr>
        <p style="font-size: 12px; color: #777;">Đây là email tự động, vui lòng không trả lời.</p>
    </div>
    """

    message = MessageSchema(
        subject=f"[UTH-Conf] Xác nhận nộp bài báo #{paper_id}",
        recipients=[recipient_email],
        body=html_content,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print(f" Email sent successfully to {recipient_email}")
    except Exception as e:
        print(f" Failed to send email: {str(e)}")