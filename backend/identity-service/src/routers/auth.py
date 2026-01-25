from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError

from src.database import get_db
from src import schemas, crud
from src.auth import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
    SECRET_KEY,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

# --- 1. API ĐĂNG KÝ (Register) ---
@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


# --- 2. API ĐĂNG NHẬP (Login) ---
@router.post("/login", response_model=schemas.TokenResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, data.email)

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_names = [role.role_name.upper() for role in user.roles]

    # [CHANGE] Truyền thêm id=user.id để token có cả 'id' và 'user_id'
    access_token = create_access_token(
        subject=user.email,
        user_id=user.id,
        roles=role_names,
        id=user.id  # <--- THÊM DÒNG NÀY
    )

    refresh_token = create_refresh_token(
        subject=user.email,
        user_id=user.id,
    )

    refresh_hash = hash_token(refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    crud.save_refresh_token(db, user_id=user.id, token_hash=refresh_hash, expires_at=expires_at)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# --- 3. API REFRESH TOKEN (Rotate refresh token) ---
@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh(body: schemas.RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token type")

    user_id = payload.get("user_id")
    email = payload.get("sub")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    token_hash = hash_token(body.refresh_token)
    rt = crud.get_valid_refresh_token(db, token_hash)
    if not rt:
        raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

    user = crud.get_user_by_email(db, email=email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    role_names = [r.role_name.upper() for r in user.roles]

    # [CHANGE] Thêm id vào token mới khi refresh
    new_access = create_access_token(
        subject=user.email,
        user_id=user.id,
        roles=role_names,
        id=user.id  # <--- THÊM DÒNG NÀY
    )

    crud.revoke_refresh_token(db, token_hash)

    new_refresh = create_refresh_token(
        subject=user.email,
        user_id=user.id,
    )
    new_refresh_hash = hash_token(new_refresh)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    crud.save_refresh_token(db, user_id=user.id, token_hash=new_refresh_hash, expires_at=expires_at)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


# --- 4. API ĐĂNG XUẤT (Revoke refresh token) ---
@router.post("/logout")
def logout(body: schemas.LogoutRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token type")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    if body.all_devices:
        crud.revoke_all_refresh_tokens_of_user(db, user_id=user_id)
        return {"message": "Logout all devices successful"}

    token_hash = hash_token(body.refresh_token)
    crud.revoke_refresh_token(db, token_hash)

    return {"message": "Logout successful"}