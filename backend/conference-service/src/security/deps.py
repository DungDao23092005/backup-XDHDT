from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from .jwt import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/identity/api/auth/login")

def get_current_payload(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        return decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_roles(*allowed_roles: str):
    allowed = {r.upper() for r in allowed_roles}

    def _guard(payload: dict = Depends(get_current_payload)) -> dict:
        roles = payload.get("roles") or []
        if isinstance(roles, str):
            roles = [roles]
        roles = {str(r).upper() for r in roles}

        if allowed and roles.isdisjoint(allowed):
            raise HTTPException(status_code=403, detail="Forbidden (role)")

        return payload

    return _guard
