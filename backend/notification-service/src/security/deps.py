from typing import Any, Dict, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .jwt import decode_access_token

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
        roles = set(payload.get("roles") or [])
        if not roles.intersection(allowed):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return payload

    return _guard
