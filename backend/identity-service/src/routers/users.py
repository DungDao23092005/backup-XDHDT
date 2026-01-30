from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from src.database import get_db
from src import models, schemas, crud

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from src.auth import SECRET_KEY, ALGORITHM

# tokenUrl chỉ dùng cho Swagger "Authorize" UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# --- DEPENDENCIES ---

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_user(payload=Depends(lambda token=Depends(oauth2_scheme): decode_token(token))):
    """Yêu cầu người dùng đã đăng nhập (có access token hợp lệ)"""
    return payload


def require_admin(payload=Depends(require_user)):
    """Yêu cầu người dùng có quyền ADMIN"""
    roles = payload.get("roles") or []
    if isinstance(roles, str):
        roles = [roles]
    # Chuẩn hóa role về chữ hoa để so sánh
    roles = [str(r).upper() for r in roles]
    
    if "ADMIN" not in roles:
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


# --- ROUTER CONFIG ---

router = APIRouter(prefix="/api/users", tags=["Users"])


# --- 1. API NGƯỜI DÙNG TỰ THAO TÁC ---

@router.get(
    "/me",
    response_model=schemas.UserResponse,
    summary="Lấy thông tin cá nhân hiện tại"
)
def get_me(
    db: Session = Depends(get_db),
    payload=Depends(require_user),
):
    """
    Lấy toàn bộ thông tin hồ sơ của người dùng đang đăng nhập bao gồm:
    Full name, Department, Research interests, Phone, etc.
    """
    user_id = payload.get("user_id")
    
    user = (
        db.query(models.User)
        .options(joinedload(models.User.roles))
        .filter(models.User.id == int(user_id))
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.put(
    "/me", 
    response_model=schemas.UserResponse, 
    summary="Cập nhật hồ sơ cá nhân"
)
def update_me(
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    payload=Depends(require_user),
):
    """
    Cho phép người dùng tự chỉnh sửa thông tin hồ sơ của mình (dùng cho trang Profile).
    """
    user_id = payload.get("user_id")
    try:
        updated_user = crud.update_user(db=db, user_id=user_id, user_update=user_data)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- 2. API DÀNH CHO QUẢN TRỊ VIÊN (ADMIN) ---

@router.get("/", response_model=list[schemas.UserResponse], summary="Liệt kê tất cả người dùng")
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Admin lấy danh sách toàn bộ user để quản lý (Dashboard)"""
    return crud.list_users(db)


@router.post("/registration", response_model=schemas.UserResponse, summary="Admin tạo tài khoản mới")
def create_user_by_admin(
    user_data: schemas.UserCreateByAdmin,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Admin tạo tài khoản và gán role trực tiếp cho user"""
    db_user = crud.get_user_by_email(db, email=user_data.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return crud.create_user_by_admin(db=db, user=user_data)


@router.put("/{user_id}/role", summary="Cập nhật quyền hạn của người dùng")
def update_user_role(
    user_id: int,
    body: schemas.UpdateRoleRequest, # Dùng schema từ src.schemas
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Admin thay đổi quyền (Role) của một user bất kỳ"""
    user, error = crud.set_user_single_role(db, user_id, body.role_name.strip().upper())
    
    if error:
        status_code = 404 if "not found" in error.lower() else 400
        raise HTTPException(status_code=status_code, detail=error)

    return {"message": "Role updated", "user_id": user_id, "role": body.role_name}


@router.put("/{user_id}", response_model=schemas.UserResponse, summary="Admin cập nhật thông tin bất kỳ user nào")
def admin_update_user_info(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Admin chỉnh sửa thông tin (Tên, Email, v.v.) của người dùng khác"""
    try:
        updated_user = crud.update_user(db=db, user_id=user_id, user_update=user_data)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}", summary="Xóa người dùng vĩnh viễn")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Admin xóa tài khoản người dùng"""
    success = crud.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user_public_info(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_id(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user