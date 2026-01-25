# backend/submission-service/src/utils/security.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer()

# CẤU HÌNH (Phải khớp với Identity Service)
SECRET_KEY = "SECRET_KEY_CHANGE_ME" 
ALGORITHM = "HS256"

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        
        if email is None or role is None:
             raise HTTPException(status_code=401, detail="Invalid token payload")
             
        # Mock user_id dựa trên role để test (Author=2, Reviewer=3)
        user_id = 2 if role == "AUTHOR" else 3
        
        return {"email": email, "role": role, "id": user_id}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )