import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from jose import jwt, JWTError
from passlib.context import CryptContext
import hashlib

# ========================
# CONFIG (from ENV)
# ========================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "SECRET_KEY_CHANGE_ME"))
ALGORITHM = os.getenv("JWT_ALGORITHM", os.getenv("ALGORITHM", "HS256"))

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ========================
# PASSWORD
# ========================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ========================
# TOKEN HELPERS
# ========================
def _normalize_roles(roles: Union[str, List[Any], None]) -> List[str]:
    if roles is None:
        return []
    if isinstance(roles, str):
        return [roles.upper()]
    if isinstance(roles, list):
        out = []
        for r in roles:
            if isinstance(r, str):
                out.append(r.upper())
            elif isinstance(r, dict):
                # phòng trường hợp roles là list object
                val = r.get("role_name") or r.get("name") or r.get("role")
                if val:
                    out.append(str(val).upper())
        return out
    return []


def create_access_token(
    *,
    subject: str,
    user_id: Optional[int] = None,
    roles: Union[str, List[Any], None] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
    **kwargs, # <--- [QUAN TRỌNG] Thêm kwargs để nhận các tham số tùy biến như 'id'
) -> str:
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": subject,
        "user_id": user_id,
        "roles": _normalize_roles(roles),
        "iat": int(now.timestamp()),
        "exp": expire,
    }

    # [FIX] Tự động thêm 'id' vào payload nếu có user_id
    # Điều này giúp Review Service lấy được current_user['id'] mà không bị lỗi KeyError
    if user_id is not None:
        payload["id"] = user_id

    # Merge extra_claims nếu có
    if extra_claims:
        payload.update(extra_claims)

    # Merge các tham số khác truyền qua kwargs (ví dụ: id=...)
    if kwargs:
        payload.update(kwargs)

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(
    *,
    subject: str,
    user_id: Optional[int] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
    **kwargs, # <--- [QUAN TRỌNG] Thêm kwargs
) -> str:
    now = datetime.utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload: Dict[str, Any] = {
        "sub": subject,
        "user_id": user_id,
        "iat": int(now.timestamp()),
        "exp": expire,
        "type": "refresh",
    }
    
    # [FIX] Tự động thêm 'id' cho nhất quán
    if user_id is not None:
        payload["id"] = user_id

    if extra_claims:
        payload.update(extra_claims)
        
    if kwargs:
        payload.update(kwargs)

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        payload["roles"] = _normalize_roles(payload.get("roles"))
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}") from e