# src/crud.py
import secrets
import requests 
from sqlalchemy.orm import Session, joinedload
from src import models, schemas
from src.auth import get_password_hash
from datetime import datetime, timedelta

# [CẤU HÌNH] Địa chỉ của Conference Service
# Nếu chạy Docker chung mạng lưới thì đổi thành: "http://conference_service:8000"
# Nếu chạy Localhost thì để port của Conference Service (ví dụ 8001)
CONFERENCE_SERVICE_URL = "http://conference-service:8000"

# --- USER GETTERS ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def list_users(db: Session):
    return db.query(models.User).options(joinedload(models.User.roles)).all()

# --- PASSWORD RESET & TOKEN ---
def create_reset_token(db: Session, email: str):
    user = get_user_by_email(db, email)
    if not user:
        return None 
    
    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    user.reset_token = otp_code
    user.reset_token_expires_at = expires_at
    
    db.commit()
    db.refresh(user)
    
    return otp_code

def verify_reset_token(db: Session, token: str):
    now = datetime.utcnow()
    user = (
        db.query(models.User)
        .filter(models.User.reset_token == token)
        .filter(models.User.reset_token_expires_at > now) 
        .first()
    )
    return user

def reset_password(db: Session, token: str, new_password: str):
    user = verify_reset_token(db, token)
    if not user:
        return False 
    
    user.password_hash = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    
    db.commit()
    db.refresh(user)
    return True

def update_password(db: Session, user_id: int, new_password: str):
    user = get_user_by_id(db, user_id)
    if user:
        user.password_hash = get_password_hash(new_password)
        db.commit()
        db.refresh(user)
    return user

# --- USER CREATION & UPDATE ---
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)

    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        organization=user.organization,
        department=user.department,           
        research_interests=user.research_interests, 
        phone=user.phone,                     
        is_active=user.is_active
    )

    if user.roles and len(user.roles) > 0:
        for role_name in user.roles:
            role_key = str(role_name).upper()
            role_obj = db.query(models.Role).filter(models.Role.role_name == role_key).first()
            if role_obj:
                db_user.roles.append(role_obj)
    else:
        default_role = db.query(models.Role).filter(models.Role.role_name == "AUTHOR").first()
        if default_role:
            db_user.roles.append(default_role)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_user_by_admin(db: Session, user: schemas.UserCreateByAdmin):
    hashed_password = get_password_hash(user.password)

    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        organization=user.organization,
        department=user.department,           
        research_interests=user.research_interests, 
        phone=user.phone,                     
        is_active=user.is_active
    )

    target_role_name = (user.role or "AUTHOR").upper()
    role_obj = db.query(models.Role).filter(models.Role.role_name == target_role_name).first()
    
    if role_obj:
        db_user.roles.append(role_obj)
    else:
        default_role = db.query(models.Role).filter(models.Role.role_name == "AUTHOR").first()
        if default_role:
            db_user.roles.append(default_role)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    if user_update.full_name is not None:
        db_user.full_name = user_update.full_name
    
    if user_update.email is not None:
        existing_email = get_user_by_email(db, user_update.email)
        if existing_email and existing_email.id != user_id:
            raise Exception("Email already exists") 
        db_user.email = user_update.email

    if user_update.organization is not None:
        db_user.organization = user_update.organization

    if user_update.department is not None:
        db_user.department = user_update.department

    if user_update.research_interests is not None:
        db_user.research_interests = user_update.research_interests

    if user_update.phone is not None:
        db_user.phone = user_update.phone

    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False 
    
    db.delete(db_user)
    db.commit()
    return True

def set_user_single_role(db: Session, user_id: int, role_name: str):
    user = (
        db.query(models.User)
        .options(joinedload(models.User.roles))
        .filter(models.User.id == user_id)
        .first()
    )
    if not user:
        return None, "User not found"

    role = db.query(models.Role).filter(models.Role.role_name == role_name).first()
    if not role:
        return None, f"Role not found: {role_name}"

    user.roles = [role]
    db.commit()
    db.refresh(user)
    return user, None

# --- REFRESH TOKEN ---
def save_refresh_token(db: Session, user_id: int, token_hash: str, expires_at: datetime):
    rt = models.RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        revoked=False,
        expires_at=expires_at
    )
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt

def get_valid_refresh_token(db: Session, token_hash: str):
    now = datetime.utcnow()
    return (
        db.query(models.RefreshToken)
        .filter(models.RefreshToken.token_hash == token_hash)
        .filter(models.RefreshToken.revoked == False)
        .filter(models.RefreshToken.expires_at > now)
        .first()
    )

def revoke_refresh_token(db: Session, token_hash: str) -> bool:
    rt = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash).first()
    if not rt:
        return False
    rt.revoked = True
    db.commit()
    return True

def revoke_all_refresh_tokens_of_user(db: Session, user_id: int):
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user_id).update(
        {"revoked": True}, synchronize_session=False
    )
    db.commit()

# --- AUDIT LOGS (HOẠT ĐỘNG HỆ THỐNG) ---
def log_activity(db: Session, user_id: int, action: str, target: str = None, status: str = "SUCCESS"):
    """Ghi lại hoạt động của người dùng"""
    new_log = models.AuditLog(
        user_id=user_id,
        action=action,
        target=target,
        status=status,
        timestamp=datetime.utcnow()
    )
    db.add(new_log)
    db.commit()

def get_recent_activities(db: Session, limit: int = 10):
    """Lấy danh sách hoạt động gần đây kèm tên User"""
    logs = (
        db.query(models.AuditLog)
        .options(joinedload(models.AuditLog.user)) 
        .order_by(models.AuditLog.timestamp.desc()) 
        .limit(limit)
        .all()
    )
    
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "action": log.action,
            "target": log.target,
            "timestamp": log.timestamp,
            "user_name": log.user.full_name if log.user else "Hệ thống",
            "status": log.status
        })
    return results

# --- STUBS ---
def create_email_log_entry(db: Session, recipient: str, subject: str):
    pass 

def update_email_log_status(db: Session, log_id: int, status: str, error: str = None):
    pass

# --- THỐNG KÊ DASHBOARD ---

def count_users(db: Session):
    """Đếm tổng số user đang hoạt động"""
    return db.query(models.User).filter(models.User.is_active == True).count()

def count_conferences_realtime():
    """
    [NEW] Gọi API sang Conference Service để lấy số liệu thực tế.
    """
    try:
        # Gọi API: GET /api/conferences/count-total
        # Timeout 2s để tránh treo nếu service kia chết
        response = requests.get(f"{CONFERENCE_SERVICE_URL}/api/conferences/count-total", timeout=2)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("total", 0) 
        else:
            print(f"[WARN] Gọi Conference Service thất bại: {response.status_code}")
            return 0 
            
    except Exception as e:
        print(f"[ERR] Không thể kết nối Conference Service: {str(e)}")
        # Trả về 0 nếu không kết nối được để Dashboard vẫn load được các phần khác
        return 0
    
