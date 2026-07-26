import os
import smtplib
from email.message import EmailMessage
import httpx
import logging

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
    If no credentials are provided, prints to console (Development mode).
    """
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_port = os.environ.get("SMTP_PORT", 587)
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    resend_api_key = os.environ.get("RESEND_API_KEY")

    subject = "Your ArchiCraft Verification Code"
    body = f"Your verification code is: {otp_code}\nThis code will expire in 5 minutes."

    if smtp_host and smtp_user and smtp_pass:
        try:
            msg = EmailMessage()
            msg.set_content(body)
            msg['Subject'] = subject
            msg['From'] = smtp_user
            msg['To'] = to_email

            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            logger.info("Email sent via SMTP.")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
            # Fall through to Resend

    if resend_api_key:
        try:
            async with httpx.AsyncClient() as client:
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
        except Exception as e:
            logger.error(f"Failed to send email via Resend API: {e}")
            # Fall through to console fallback

    # Development Fallback
    logger.warning("No email credentials configured or sending failed. Falling back to console print.")
    print("\n" + "="*40)
    print("DEVELOPMENT OTP FALLBACK")
    print(f"To: {to_email}")
    print(f"Code: {otp_code}")
    print("="*40 + "\n")
    return True
