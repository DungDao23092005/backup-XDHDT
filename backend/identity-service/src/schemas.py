# src/schemas.py
from typing import List, Optional
from pydantic import BaseModel

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
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    roles: List[str] = ["AUTHOR"]

# ✅ THÊM MỚI: Schema dùng riêng cho Admin tạo user (Cho phép chọn Role đơn lẻ)
class UserCreateByAdmin(UserBase):
    password: str
    role: str = "AUTHOR"  # Mặc định là AUTHOR nếu không chọn

class UserResponse(UserBase):
    id: int
    roles: List[RoleBase] = [] 

    class Config:
        from_attributes = True

class UpdateRoleRequest(BaseModel):
    role_name: str


class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str
    all_devices: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None