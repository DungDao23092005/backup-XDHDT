# backend/submission-service/src/security/deps.py
import os
from typing import Any, Dict, List, Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .jwt import decode_access_token

bearer = HTTPBearer(auto_error=False)

INTERNAL_KEY = os.getenv("INTERNAL_KEY", "").strip()


def get_current_payload(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    x_internal_key: Optional[str] = Header(default=None, alias="x-internal-key"),
) -> Dict[str, Any]:
    # ✅ service-to-service
    if INTERNAL_KEY and x_internal_key and x_internal_key == INTERNAL_KEY:
        return {"user_id": 0, "roles": ["INTERNAL", "ADMIN"]}

    # ✅ normal user
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

        # ✅ internal bypass
        if "INTERNAL" in roles:
            return payload

        if not roles.intersection(allowed):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return payload

    return _guard