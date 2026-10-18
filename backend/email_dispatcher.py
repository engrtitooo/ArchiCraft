import os
import smtplib
from email.message import EmailMessage
import httpx
import logging
from starlette.concurrency import run_in_threadpool
from backend.security_config import read_secret, SecretConfigurationError

logger = logging.getLogger(__name__)

def mask_email(email: str) -> str:
    if not email or '@' not in email:
        return email
    parts = email.split('@')
    name, domain = parts[0], parts[1]
    if len(name) <= 2:
        masked_name = name[0] + "***"
    else:
        masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
    return f"{masked_name}@{domain}"

async def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Sends an OTP code via SMTP, falling back to Resend API.
    Returns False on delivery failure; verification codes are never logged.
    """
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT", 587)
    smtp_user = os.environ.get("SMTP_USER")
    try:
        smtp_pass = read_secret("SMTP_PASS") if os.environ.get("SMTP_PASS") else None
    except SecretConfigurationError:
        smtp_pass = None
        logger.error("SMTP credential must be replaced.")
    try:
        resend_api_key = read_secret("RESEND_API_KEY") if os.environ.get("RESEND_API_KEY") else None
    except SecretConfigurationError:
        resend_api_key = None

    subject = "Your ArchiCraft Verification Code"
    body = f"Your verification code is: {otp_code}\nThis code will expire in 5 minutes."

    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = EmailMessage()
            msg.set_content(body)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = to_email

            def deliver():
                with smtplib.SMTP(smtp_host, int(smtp_port), timeout=15) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)

            await run_in_threadpool(deliver)
            logger.info("Email sent via SMTP.")
            return True
        except Exception:
            logger.error("SMTP delivery failed.")
            # Fall through to Resend

    if resend_api_key:
        try:
            async with httpx.AsyncClient(follow_redirects=False) as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {resend_api_key}"},
                    json={
                        "from": "ArchiCraft Security <noreply@resend.dev>",
                        "to": to_email,
                        "subject": subject,
                        "text": body
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                logger.info("Email sent via Resend API.")
                return True
        except Exception:
            logger.error("Email provider delivery failed.")

    logger.error("Verification email was not delivered.")
    return False
