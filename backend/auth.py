from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException, status
import jwt as pyjwt
from backend.security_config import read_secret, SecretConfigurationError

# Read from environment variables
ALGORITHM = "HS256"
SESSION_COOKIE_NAME = "archicraft_session_v4"
SESSION_DURATION_MINUTES = 5


def signing_key() -> str:
    try:
        return read_secret("JWT_SECRET", "JWT_SECRET_KEY", minimum_length=32)
    except SecretConfigurationError:
        raise HTTPException(status_code=503, detail="Authentication configuration must be updated") from None

def create_session_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=SESSION_DURATION_MINUTES)
    to_encode.update({"exp": expire})
    return pyjwt.encode(to_encode, signing_key(), algorithm=ALGORITHM)

def get_current_session(request: Request) -> dict:
    """FastAPI dependency — raises 401 if no valid session cookie."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = pyjwt.decode(
            token, signing_key(), algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        if payload.get("sub") != "admin":
            raise pyjwt.InvalidTokenError("Invalid subject")
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
