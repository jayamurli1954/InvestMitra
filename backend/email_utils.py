"""
Email utility functions for sending password reset and verification emails
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SENDER_NAME = os.getenv("SENDER_NAME", "InvestMitra")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
FRONTEND_USE_HASH_ROUTER = os.getenv("FRONTEND_USE_HASH_ROUTER", "true").lower() == "true"


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
    Internal function to send email via SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        text_body: Plain text email body
        html_body: HTML email body
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Validate SMTP credentials
        if not SMTP_EMAIL or not SMTP_PASSWORD:
            print("Error: SMTP_EMAIL or SMTP_PASSWORD not configured in .env file")
            return False
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{SENDER_NAME} <{SMTP_EMAIL}>"
        message["To"] = to_email
        
        # Attach plain text and HTML parts
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Secure connection
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, message.as_string())
        
        print(f"✓ Email sent successfully to {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print(f"Error: SMTP authentication failed. Check SMTP_EMAIL and SMTP_PASSWORD in .env")
        return False
    except smtplib.SMTPException as e:
        print(f"Error: SMTP error occurred: {str(e)}")
        return False
    except Exception as e:
        print(f"Error: Failed to send email: {str(e)}")
        return False
