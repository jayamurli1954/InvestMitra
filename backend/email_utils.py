"""
Email utility functions for sending password reset and verification emails
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Normalize env values copied with quotes/spaces from dashboards
def _clean_env(name: str, default=None):
    value = os.getenv(name, default)
    if value is None:
        return None
    return str(value).strip().strip('"').strip("'")

# Email Configuration
BREVO_API_KEY = _clean_env("BREVO_API_KEY", "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")
SENDER_EMAIL = _clean_env("SMTP_EMAIL", "jayamurli1954@gmail.com") 
SENDER_NAME = _clean_env("SENDER_NAME", "InvestMitra")
FRONTEND_URL = _clean_env("FRONTEND_URL", "http://localhost:3000")
FRONTEND_USE_HASH_ROUTER = (_clean_env("FRONTEND_USE_HASH_ROUTER", "true").lower() == "true")


def _build_frontend_token_link(path: str, token: str) -> str:
    """Build token link compatible with HashRouter (default) and BrowserRouter."""
    base = FRONTEND_URL.rstrip("/")
    clean_path = path.lstrip("/")
    if FRONTEND_USE_HASH_ROUTER:
        return f"{base}/#/{clean_path}?token={token}"
    return f"{base}/{clean_path}?token={token}"


def send_password_reset_email(user_email: str, reset_token: str, user_name: str) -> bool:
    """
    Send password reset email with token
    
    Args:
        user_email: User's email address
        reset_token: The reset token (will be included in link)
        user_name: User's name for personalization
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create reset link
        reset_link = _build_frontend_token_link("forgot-password", reset_token)
        
        # Email content
        subject = "Reset Your Password - InvestMitra"
        
        # HTML version
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Password Reset Request</h2>
                    
                    <p>Hi {user_name},</p>
                    
                    <p>We received a request to reset your password. Click the link below to create a new password:</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p>Or copy this link: <a href="{reset_link}">{reset_link}</a></p>
                    
                    <p><strong>Security Note:</strong></p>
                    <ul>
                        <li>This link expires in 24 hours</li>
                        <li>If you didn't request this, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                    </ul>
                    
                    <p>Best regards,<br>InvestMitra Team</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated email. Please do not reply to this message.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Plain text version
        text_body = f"""
Password Reset Request

Hi {user_name},

We received a request to reset your password. Visit this link to create a new password:

{reset_link}

This link expires in 24 hours.

If you didn't request this, please ignore this email.

Best regards,
InvestMitra Team
        """
        
        # Send email
        return _send_email(user_email, subject, text_body, html_body)
        
    except Exception as e:
        print(f"Error preparing password reset email: {str(e)}")
        return False


def send_verification_email(user_email: str, verification_token: str, user_name: str) -> bool:
    """
    Send email verification email
    
    Args:
        user_email: User's email address
        verification_token: The verification token
        user_name: User's name for personalization
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Create verification link
        verify_link = _build_frontend_token_link("verify-email", verification_token)
        
        # Email content
        subject = "Verify Your Email - InvestMitra"
        
        # HTML version
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Email Verification Required</h2>
                    
                    <p>Hi {user_name},</p>
                    
                    <p>Welcome to InvestMitra! Please verify your email address by clicking the link below:</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="{verify_link}" style="background-color: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email
                        </a>
                    </div>
                    
                    <p>Or copy this link: <a href="{verify_link}">{verify_link}</a></p>
                    
                    <p><strong>Note:</strong></p>
                    <ul>
                        <li>This link expires in 24 hours</li>
                        <li>If you didn't create this account, please ignore this email</li>
                    </ul>
                    
                    <p>Best regards,<br>InvestMitra Team</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated email. Please do not reply to this message.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Plain text version
        text_body = f"""
Email Verification

Hi {user_name},

Welcome to InvestMitra! Please verify your email by visiting this link:

{verify_link}

This link expires in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
InvestMitra Team
        """
        
        # Send email
        return _send_email(user_email, subject, text_body, html_body)
        
    except Exception as e:
        print(f"Error preparing verification email: {str(e)}")
        return False


def _send_email(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    """
    Internal function to send email via Brevo HTTP API
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        text_body: Plain text email body
        html_body: HTML email body
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": BREVO_API_KEY,
            "content-type": "application/json"
        }
        payload = {
            "sender": {
                "name": SENDER_NAME,
                "email": SENDER_EMAIL
            },
            "to": [
                {
                    "email": to_email
                }
            ],
            "subject": subject,
            "htmlContent": html_body,
            "textContent": text_body
        }

        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code in [200, 201, 202]:
            print(f"✓ Email sent successfully to {to_email} via Brevo HTTP API")
            return True
        else:
            print(f"Error: Brevo API returned {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"Error: Failed to send email via Brevo: {str(e)}")
        return False
