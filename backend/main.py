import os
import secrets
import time
import logging
from pathlib import Path
from fastapi import FastAPI, Depends, Request, Response, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.auth import get_current_session, refresh_session_cookie, create_session_token, SESSION_COOKIE_NAME, signing_key
from backend.email_dispatcher import send_otp_email, mask_email
from backend.gemini import generate_content
from backend.security_config import read_secret, SecretConfigurationError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")

if not os.environ.get("APP_PASSWORD"):
    logger.critical("APP_PASSWORD is not set!")
if not ADMIN_EMAIL:
    logger.critical("ADMIN_EMAIL is not set!")

# In-memory OTP store: {ip: {otp, expires_at}}
otp_store: dict = {}

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid request"})


@app.middleware("http")
async def no_store_api_responses(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


class PasswordRequest(BaseModel):
    password: str

class OTPRequest(BaseModel):
    otp: str


@app.post("/api/verify-access")
@limiter.limit("5/minute")
async def verify_access(request: Request, data: PasswordRequest):
    try:
        app_password = read_secret("APP_PASSWORD", minimum_length=12)
        signing_key()
        if not ADMIN_EMAIL:
            raise SecretConfigurationError("Missing administrator")
    except SecretConfigurationError:
        raise HTTPException(status_code=503, detail="Authentication configuration must be updated") from None
    if not secrets.compare_digest(data.password.encode(), app_password.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    ip = get_remote_address(request)
    otp_store.pop(ip, None)
    if not await send_otp_email(ADMIN_EMAIL, otp_code):
        raise HTTPException(status_code=503, detail="Verification email could not be delivered. Please try again.")
    otp_store[ip] = {
        "otp": otp_code,
        "expires_at": time.time() + 300,
    }
    return {"message": "OTP sent", "email": mask_email(ADMIN_EMAIL)}


@app.post("/api/verify-2fa")
@limiter.limit("5/minute")
async def verify_2fa(request: Request, response: Response, data: OTPRequest):
    ip = get_remote_address(request)
    record = otp_store.get(ip)

    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No OTP pending")
    if time.time() > record["expires_at"]:
        otp_store.pop(ip, None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")
    if data.otp != record["otp"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP")

    otp_store.pop(ip, None)

    token = create_session_token({"sub": "admin"})
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="strict",
        max_age=300,
        secure=request.url.scheme == "https",
    )
    return {"message": "Authenticated"}


@app.get("/api/check-auth")
async def check_auth(request: Request, response: Response, payload: dict = Depends(get_current_session)):
    refresh_session_cookie(request, response, payload)
    response.headers["Cache-Control"] = "no-store"
    return {"status": "authenticated"}


@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(key=SESSION_COOKIE_NAME, httponly=True, samesite="strict")
    response.delete_cookie(key="archicraft_session_v3", httponly=True, samesite="strict")
    return {"message": "Logged out"}


@app.post("/api/gemini/generate")
@limiter.limit("6/minute")
async def generate(request: Request, response: Response, payload: dict = Depends(get_current_session)):
    result = await generate_content(request)
    refresh_session_cookie(request, response, payload)
    return result


# ── Static frontend ────────────────────────────────────────────────
DIST = Path(__file__).resolve().parent.parent / "frontend_dist"


def frontend_path(full_path: str) -> Path:
    candidate = (DIST / full_path).resolve()
    if not candidate.is_relative_to(DIST.resolve()):
        raise HTTPException(status_code=404)
    return candidate

if DIST.is_dir():
    _assets = os.path.join(DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        # Never catch /api routes here
        if full_path.startswith("api"):
            raise HTTPException(status_code=404)
        candidate = frontend_path(full_path)
        if candidate.is_file():
            return FileResponse(candidate)
        resp = FileResponse(os.path.join(DIST, "index.html"))
        resp.headers["Cache-Control"] = "no-store"
        return resp
