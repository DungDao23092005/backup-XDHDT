# src/schemas.py
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Phần Token (Giữ nguyên) ---
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: str
    password: str

# --- Phần Role (Quyền hạn) ---
class RoleBase(BaseModel):
    role_name: str
    
    class Config:
        from_attributes = True 

# --- Phần User (Người dùng) ---
class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    organization: Optional[str] = None
    # [NEW] Thêm các trường mới vào UserBase để dùng chung
    department: Optional[str] = None
    research_interests: Optional[List[str]] = [] # Lưu mảng string cho JSON
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    roles: List[str] = ["AUTHOR"]

# ✅ Schema dùng riêng cho Admin tạo user
class UserCreateByAdmin(UserBase):
    password: str
    role: str = "AUTHOR"

class UserResponse(UserBase):
    id: int
    roles: List[RoleBase] = [] 

    class Config:
        from_attributes = True

class UpdateRoleRequest(BaseModel):
    role_name: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr 

class ResetPasswordRequest(BaseModel):
    token: str      
    new_password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str
    all_devices: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    organization: Optional[str] = None
    department: Optional[str] = None
    research_interests: Optional[List[str]] = None
    phone: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class FirebaseLoginRequest(BaseModel):
    token: str
class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=6, description="Mật khẩu hiện tại để xác thực")
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới muốn đổi")


class AuditLogResponse(BaseModel):
    id: int
    action: str
    target: Optional[str] = None
    timestamp: datetime
    user_name: Optional[str] = "Hệ thống" 
    status: str

    class Config:
        from_attributes = True