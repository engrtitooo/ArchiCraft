import os
import secrets
import time
import logging
from fastapi import FastAPI, Depends, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.auth import get_current_session, refresh_session_cookie, create_session_token, SESSION_COOKIE_NAME
from backend.email_dispatcher import send_otp_email, mask_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

APP_PASSWORD = os.environ.get("APP_PASSWORD", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")

if not APP_PASSWORD:
    logger.critical("APP_PASSWORD is not set!")
if not ADMIN_EMAIL:
    logger.critical("ADMIN_EMAIL is not set!")

# In-memory OTP store: {ip: {otp, expires_at}}
otp_store: dict = {}

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PasswordRequest(BaseModel):
    password: str

class OTPRequest(BaseModel):
    otp: str


@app.post("/api/verify-access")
@limiter.limit("5/minute")
async def verify_access(request: Request, data: PasswordRequest):
    if not APP_PASSWORD or data.password != APP_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    otp_store[get_remote_address(request)] = {
        "otp": otp_code,
        "expires_at": time.time() + 300,
    }
    await send_otp_email(ADMIN_EMAIL, otp_code)
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
    return {"message": "Logged out"}


# ── Static frontend ────────────────────────────────────────────────
DIST = os.path.join(os.path.dirname(__file__), "../dist")

if os.path.isdir(DIST):
    _assets = os.path.join(DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        # Never catch /api routes here
        if full_path.startswith("api"):
            raise HTTPException(status_code=404)
        candidate = os.path.join(DIST, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        resp = FileResponse(os.path.join(DIST, "index.html"))
        resp.headers["Cache-Control"] = "no-store"
        return resp
