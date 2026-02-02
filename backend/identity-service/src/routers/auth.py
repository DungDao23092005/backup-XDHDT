# backend/identity-service/src/routers/auth.py
import os
import time  # [FIX] Import thư viện time
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
import firebase_admin
from firebase_admin import auth as firebase_auth

from src.database import get_db
from src import schemas, crud, models
from src.auth import (
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token, 
    get_password_hash,
    SECRET_KEY,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS
)
from src.dependencies import get_current_payload
from src.utils.notification_client import send_email_via_notification_service

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

    # Tạo Access Token
    access_token = create_access_token(
        subject=user.email,
        user_id=user.id,
        roles=role_names,
        id=user.id 
    )

    refresh_token = create_refresh_token(
        subject=user.email,
        user_id=user.id,
    )

    refresh_hash = hash_token(refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    crud.save_refresh_token(db, user_id=user.id, token_hash=refresh_hash, expires_at=expires_at)
    crud.log_activity(db, user_id=user.id, action="Đăng nhập hệ thống", target="Portal")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# --- [MỚI] 2.1 API ĐĂNG NHẬP BẰNG FIREBASE ---
@router.post("/login/firebase", response_model=schemas.TokenResponse)
def login_with_firebase(
    request: schemas.FirebaseLoginRequest, 
    db: Session = Depends(get_db)
):
    # [FIX QUAN TRỌNG] Ngủ 3 giây để đồng hồ Docker kịp đuổi theo đồng hồ Google
    # Khắc phục lỗi "Token used too early"
    time.sleep(3)

    try:
        # 1. Xác thực Token với Firebase
        decoded_token = firebase_auth.verify_id_token(request.token)
        email = decoded_token.get('email')
        name = decoded_token.get('name', 'Firebase User')
        
        if not email:
             raise HTTPException(status_code=400, detail="Google account must have an email")

    except Exception as e:
        print(f"Firebase Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid Firebase Token"
        )

    # 2. Tìm User trong DB
    user = crud.get_user_by_email(db, email=email)

    # 3. Nếu chưa có user -> Tạo mới (Auto-registration)
    if not user:
        print(f"--> Creating new user from Firebase: {email}")
        
        # Tìm role AUTHOR
        author_role = db.query(models.Role).filter(models.Role.role_name == "AUTHOR").first()
        
        user = models.User(
            email=email,
            full_name=name,
            password_hash=get_password_hash("FIREBASE_OAUTH_LOGIN"), # Mật khẩu ngẫu nhiên
            is_active=True
        )
        if author_role:
             user.roles.append(author_role)
             
        db.add(user)
        db.commit()
        db.refresh(user)
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is inactive")

    # 4. Cấp Token (Logic giống hệt hàm login thường)
    role_names = [role.role_name.upper() for role in user.roles]

    access_token = create_access_token(
        subject=user.email,
        user_id=user.id,
        roles=role_names,
        id=user.id 
    )

    refresh_token = create_refresh_token(
        subject=user.email,
        user_id=user.id,
    )

    # Lưu refresh token vào DB
    refresh_hash = hash_token(refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    crud.save_refresh_token(db, user_id=user.id, token_hash=refresh_hash, expires_at=expires_at)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# --- 3. API REFRESH TOKEN ---
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

    new_access = create_access_token(
        subject=user.email,
        user_id=user.id,
        roles=role_names,
        id=user.id
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


# --- 4. API ĐĂNG XUẤT ---
@router.post("/logout")
def logout(body: schemas.LogoutRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    if body.all_devices:
        crud.revoke_all_refresh_tokens_of_user(db, user_id=user_id)
        return {"message": "Logout all devices successful"}

    token_hash = hash_token(body.refresh_token)
    crud.revoke_refresh_token(db, token_hash)

    return {"message": "Logout successful"}


# --- 5. QUÊN MẬT KHẨU ---
@router.post("/forgot-password", summary="Step 1: Request reset token via email")
def forgot_password(
    request: schemas.ForgotPasswordRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    token = crud.create_reset_token(db, request.email)
    
    if token:
        user = crud.get_user_by_email(db, request.email)
        if user:
            email_subject = "[UTH-ConfMS] Mã xác nhận khôi phục mật khẩu"
            html_content = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 500px;">
                <h2 style="color: #1173d4; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
                <p>Mã xác thực (OTP) của bạn là:</p>
                <div style="background-color: #f0f8ff; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1173d4;">{token}</span>
                </div>
                <p style="color: #666; font-size: 13px;">Mã này sẽ hết hạn sau 15 phút.</p>
            </div>
            """

            background_tasks.add_task(
                send_email_via_notification_service, 
                to_email=request.email,
                subject=email_subject, 
                content=html_content,
                receiver_id=user.id
            )
    
    return {"message": "If this email is registered, you will receive an OTP via email."}


# --- 6. ĐẶT LẠI MẬT KHẨU ---
@router.post("/reset-password", summary="Step 2: Submit new password with token")
def reset_password(
    request: schemas.ResetPasswordRequest, 
    db: Session = Depends(get_db)
):
    success = crud.reset_password(db, request.token, request.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid or expired reset token"
        )
    
    return {"message": "Mật khẩu đã thay đổi thành công!"}


# --- 7. XÁC THỰC OTP ---
@router.post("/verify-otp")
def verify_otp_endpoint(req: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, req.email)
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
    
    if user.reset_token != req.otp:
         raise HTTPException(status_code=400, detail="Invalid OTP")
         
    if user.reset_token_expires_at < datetime.utcnow():
         raise HTTPException(status_code=400, detail="OTP Expired")
         
    return {"message": "OTP Valid", "token": req.otp}

@router.post("/change-password")
def change_password(
    body: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    payload = Depends(get_current_payload) # Bắt buộc phải có Token đăng nhập
):
    """
    Đổi mật khẩu cho user đang đăng nhập.
    Yêu cầu: Access Token hợp lệ.
    """
    # 1. Lấy User ID từ Token Payload
    # Payload của bạn có 'user_id' hoặc 'id' (do create_access_token trong src/auth.py tạo ra)
    user_id = payload.get("user_id") or payload.get("id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalid: Missing user_id")

    # 2. Tìm user trong DB
    user = crud.get_user_by_id(db, int(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác")
    if body.old_password == body.new_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới không được trùng với mật khẩu cũ")
    crud.update_password(db, user.id, body.new_password)
    return {"message": "Đổi mật khẩu thành công."}