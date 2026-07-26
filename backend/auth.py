import os
from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException, status
import jwt as pyjwt

# Read from environment variables
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
ALGORITHM = "HS256"
SESSION_COOKIE_NAME = "archicraft_session_v3"
SESSION_DURATION_MINUTES = 5

def create_session_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=SESSION_DURATION_MINUTES)
    to_encode.update({"exp": expire})
    return pyjwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_session(request: Request) -> dict:
    """FastAPI dependency — raises 401 if no valid session cookie."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Server misconfigured")
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

def refresh_session_cookie(request: Request, response, payload: dict):
    """Refreshes the session cookie for another 5 minutes."""
    data = {k: v for k, v in payload.items() if k != "exp"}
    new_token = create_session_token(data)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=new_token,
        httponly=True,
        samesite="strict",
        max_age=SESSION_DURATION_MINUTES * 60,
        secure=request.url.scheme == "https",
    )
