# src/crud.py
import secrets
import string
from sqlalchemy.orm import Session, joinedload
from src import models, schemas
from src.auth import get_password_hash
from datetime import datetime, timedelta

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

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

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)

    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        organization=user.organization,
        department=user.department,           # [NEW]
        research_interests=user.research_interests, # [NEW]
        phone=user.phone,                     # [NEW]
        is_active=user.is_active
    )

    if user.roles and len(user.roles) > 0:
        for role_name in user.roles:
            role_key = str(role_name).upper()
            role_obj = db.query(models.Role).filter(models.Role.role_name == role_key).first()
            if role_obj:
                db_user.roles.append(role_obj)
            else:
                print(f"[WARN] Role not found: {role_key}")
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
        department=user.department,           # [NEW]
        research_interests=user.research_interests, # [NEW]
        phone=user.phone,                     # [NEW]
        is_active=user.is_active
    )

    target_role_name = (user.role or "AUTHOR").upper()
    role_obj = db.query(models.Role).filter(models.Role.role_name == target_role_name).first()
    
    if role_obj:
        db_user.roles.append(role_obj)
    else:
        print(f"[WARN] Admin requested role '{target_role_name}' but not found. Fallback to AUTHOR.")
        default_role = db.query(models.Role).filter(models.Role.role_name == "AUTHOR").first()
        if default_role:
            db_user.roles.append(default_role)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

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

def list_users(db: Session):
    return db.query(models.User).options(joinedload(models.User.roles)).all()

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

    # [NEW] Cập nhật các trường hồ sơ mới
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

def create_email_log_entry(db: Session, recipient: str, subject: str):
    pass 

def update_email_log_status(db: Session, log_id: int, status: str, error: str = None):
    pass