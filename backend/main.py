import os
import secrets
import time
from fastapi import FastAPI, Depends, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from backend.auth import get_current_session, refresh_session_cookie, create_session_token, SESSION_COOKIE_NAME
from backend.email_dispatcher import send_otp_email, mask_email

logging.basicConfig(level=logging.INFO)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_PASSWORD = os.environ.get("APP_PASSWORD")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")

if not APP_PASSWORD:
    raise RuntimeError("FATAL: APP_PASSWORD environment variable is not set.")
if not ADMIN_EMAIL:
    raise RuntimeError("FATAL: ADMIN_EMAIL environment variable is not set.")

# Temporary in-memory store for OTPs (For production, use Redis)
# format: { "client_ip": {"otp": "123456", "expires_at": timestamp} }
otp_store = {}

class PasswordRequest(BaseModel):
    password: str

class OTPRequest(BaseModel):
    otp: str

@app.post("/api/verify-access")
@limiter.limit("5/minute")
async def verify_access(request: Request, data: PasswordRequest):
    if data.password != APP_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")
    
    # Generate 6-digit OTP
    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    expires_at = time.time() + 300 # 5 minutes

    client_ip = get_remote_address(request)
    otp_store[client_ip] = {"otp": otp_code, "expires_at": expires_at}

    # Send email
    await send_otp_email(ADMIN_EMAIL, otp_code)

    return {"message": "OTP sent", "email": mask_email(ADMIN_EMAIL)}


@app.post("/api/verify-2fa")
@limiter.limit("5/minute")
async def verify_2fa(request: Request, response: Response, data: OTPRequest):
    client_ip = get_remote_address(request)
    record = otp_store.get(client_ip)

    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No OTP requested or expired")
    
    if time.time() > record["expires_at"]:
        del otp_store[client_ip]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")

    if data.otp != record["otp"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP")

    # Clear OTP
    del otp_store[client_ip]

    # Issue Session
    payload = {"sub": "admin"}
    token = create_session_token(payload)
    
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="strict",
        max_age=300, # 5 minutes
        secure=request.url.scheme == "https",
    )
    return {"message": "Authenticated successfully"}


@app.get("/api/check-auth")
async def check_auth(request: Request, response: Response, payload: dict = Depends(get_current_session)):
    # Refresh session cookie
    refresh_session_cookie(request, response, payload)
    
    # Strict headers to prevent CDN caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return {"status": "authenticated"}


@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite="strict",
    )
    return {"message": "Logged out"}

# Mount the React frontend
frontend_dist = os.path.join(os.path.dirname(__file__), "../dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    # Pass through 404s for API routes
    if request.url.path.startswith("/api/"):
        return Response(content="Not Found", status_code=404)
    # Serve index.html for client-side routing
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return Response(content="Frontend not built", status_code=404)

