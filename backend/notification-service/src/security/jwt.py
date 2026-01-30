import os
from typing import Any, Dict, List, Union
from jose import JWTError, jwt

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "SECRET_KEY_CHANGE_ME"))
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", os.getenv("ALGORITHM", "HS256"))

def normalize_roles(roles: Union[str, List[Any], None]) -> List[str]:
    if roles is None:
        return []
    if isinstance(roles, str):
        return [roles.upper()]
    if isinstance(roles, list):
        out: List[str] = []
        for r in roles:
            if isinstance(r, str):
                out.append(r.upper())
            elif isinstance(r, dict):
                val = r.get("role_name") or r.get("name") or r.get("role")
                if val:
                    out.append(str(val).upper())
        return out
    return []

def decode_access_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError("Invalid or expired token") from e
