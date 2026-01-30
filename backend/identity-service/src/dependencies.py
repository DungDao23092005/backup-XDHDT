# src/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any

# Import hàm giải mã token từ file auth.py nằm cùng thư mục src
from src.auth import decode_token 

security = HTTPBearer()

def get_current_payload(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Dependency lấy token từ Header, giải mã và trả về payload (thông tin user).
    Nếu token sai, trả về lỗi 401.
    """
    token = credentials.credentials
    try:
        # Hàm decode_token này nằm trong src/auth.py của bạn
        payload = decode_token(token)
        return payload
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )