from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from sqlalchemy.orm import Session
from ..config import settings
from .. import models, crud
from ..database import SessionLocal

conf = ConnectionConfig(
    MAIL_USERNAME = settings.MAIL_USERNAME,
    MAIL_PASSWORD = settings.MAIL_PASSWORD,
    MAIL_FROM = settings.MAIL_FROM,
    MAIL_PORT = settings.MAIL_PORT,
    MAIL_SERVER = settings.MAIL_SERVER,
    MAIL_STARTTLS = settings.MAIL_STARTTLS,
    MAIL_SSL_TLS = settings.MAIL_SSL_TLS,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

async def send_email_async(
    recipient_email: str,
    subject: str,
    html_content: str
):
    
    db: Session = SessionLocal()
    
    log_id = None
   
    try:
        log_entry = crud.create_email_log_entry(db, recipient_email, subject)
        log_id = log_entry.id
        
        message = MessageSchema(
            subject=subject,
            recipients=[recipient_email],
            body=html_content,
            subtype=MessageType.html
        )
        fm = FastMail(conf)
        await fm.send_message(message)
        
        crud.update_email_log_status(db, log_id, models.EmailStatus.SENT)
        print(f" [Email Log #{log_id}] Sent successfully")

    except Exception as e:
        print(f" [Email Log #{log_id}] Failed: {str(e)}")
        if log_id:
            crud.update_email_log_status(db, log_id, models.EmailStatus.FAILED, str(e))
            
    finally:
        db.close()