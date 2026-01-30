from typing import Any, Dict, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .jwt import decode_access_token
from dataclasses import dataclass
from .jwt import normalize_roles

bearer = HTTPBearer(auto_error=False)

def get_current_payload(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Dict[str, Any]:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        return decode_access_token(creds.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

def require_roles(allowed_roles: List[str]):
    allowed = {r.upper() for r in allowed_roles}

    def _guard(payload: Dict[str, Any] = Depends(get_current_payload)) -> Dict[str, Any]:
        roles = set(normalize_roles(payload.get("roles")))
        if not roles.intersection(allowed):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return payload

    return _guard

@dataclass
class CurrentUser:
    id: int
    email: Optional[str] = None
    roles: List[str] = None



def get_current_user(payload: Dict[str, Any] = Depends(get_current_payload)) -> CurrentUser:
    # 1. Ưu tiên lấy user_id hoặc id (thường là số nguyên trong hệ thống của bạn)
    uid = payload.get("user_id") or payload.get("id")
    
    # 2. Nếu không có, mới lấy sub (nhưng sub có thể là email, nên cần cẩn thận)
    if uid is None:
        uid = payload.get("sub")

    if uid is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user id",
        )

    # 3. Log ra xem rốt cuộc nó là cái gì (để debug)
    print(f"DEBUG TOKEN UID: {uid} (Type: {type(uid)})")

    # 4. Thử convert sang int, nếu không được thì giữ nguyên (cho phép UUID/String ID)
    uid_final = uid
    try:
        uid_final = int(uid)
    except (ValueError, TypeError):
        # Nếu không ép kiểu được (ví dụ là email), ta vẫn chấp nhận nó là ID dạng chuỗi
        pass 

    return CurrentUser(
        id=uid_final,
        email=payload.get("email"),
        roles=payload.get("roles") or [],
    )