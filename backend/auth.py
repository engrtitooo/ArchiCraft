import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Request, HTTPException, status
from jose import jwt, JWTError

# Use a secure secret key, defaulting to a random string in dev
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "supersecretkey_for_dev_only_change_in_prod")
ALGORITHM = "HS256"
SESSION_COOKIE_NAME = "session_token"
SESSION_DURATION_MINUTES = 5

def create_session_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=SESSION_DURATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_session(request: Request):
    """
    FastAPI Dependency to enforce session existence via HttpOnly cookie.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

def refresh_session_cookie(request: Request, response, payload: dict):
    """
    Refreshes the JWT session for exactly 5 minutes if valid.
    """
    # Remove exp before re-encoding
    data_to_encode = {k: v for k, v in payload.items() if k != 'exp'}
    new_token = create_session_token(data_to_encode)
    
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=new_token,
        httponly=True,
        samesite="strict",
        max_age=SESSION_DURATION_MINUTES * 60,
        secure=request.url.scheme == "https", # Secure in prod
    )
