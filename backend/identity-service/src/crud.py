# src/crud.py
from sqlalchemy.orm import Session, joinedload
from src import models, schemas
from src.auth import get_password_hash
from datetime import datetime

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

# --- Hàm tạo user cho Đăng ký công khai (Giữ nguyên) ---
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)

    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        organization=user.organization,
        is_active=user.is_active
    )

    # Logic cũ: Xử lý danh sách roles (List[str])
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
        else:
            print("[WARN] Default role AUTHOR not found in DB")

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ✅ THÊM MỚI: Hàm tạo user dành riêng cho Admin (Xử lý role đơn lẻ)
def create_user_by_admin(db: Session, user: schemas.UserCreateByAdmin):
    hashed_password = get_password_hash(user.password)

    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        organization=user.organization,
        is_active=user.is_active
    )

    # Logic mới: Xử lý role đơn (str)
    target_role_name = (user.role or "AUTHOR").upper()
    
    role_obj = db.query(models.Role).filter(models.Role.role_name == target_role_name).first()
    
    if role_obj:
        db_user.roles.append(role_obj)
    else:
        # Fallback về AUTHOR nếu role gửi lên bị sai
        print(f"[WARN] Admin requested role '{target_role_name}' but not found. Fallback to AUTHOR.")
        default_role = db.query(models.Role).filter(models.Role.role_name == "AUTHOR").first()
        if default_role:
            db_user.roles.append(default_role)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Các hàm Token và Utility khác (Giữ nguyên) ---

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
    
    # Cập nhật từng trường nếu có dữ liệu gửi lên
    if user_update.full_name is not None:
        db_user.full_name = user_update.full_name
    
    if user_update.email is not None:
        # Kiểm tra xem email mới có bị trùng với người khác không
        existing_email = get_user_by_email(db, user_update.email)
        if existing_email and existing_email.id != user_id:
            raise Exception("Email already exists") # Báo lỗi nếu trùng
        db_user.email = user_update.email

    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False # Không tìm thấy để xóa
    
    db.delete(db_user)
    db.commit()
    return True