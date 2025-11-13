"""
Email Configuration Test Script
Run this to test if email sending is working
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("\n" + "="*70)
print("📧 EMAIL CONFIGURATION TEST")
print("="*70 + "\n")

# Test 1: Load configuration
print("1. Loading configuration...")
try:
    from config import config, is_email_enabled
    print("   ✅ Config module loaded")
    print(f"   Email enabled: {is_email_enabled()}")
    print(f"   SMTP Server: {config.SMTP_SERVER}")
    print(f"   SMTP Port: {config.SMTP_PORT}")
    print(f"   SMTP Email: {config.SMTP_EMAIL}")
    print(f"   SMTP Password: {'*' * len(config.SMTP_PASSWORD) if config.SMTP_PASSWORD else 'NOT SET'}")
except Exception as e:
    print(f"   ❌ Error loading config: {e}")
    sys.exit(1)

print()

# Test 2: Check if email is enabled
print("2. Checking email configuration...")
if not is_email_enabled():
    print("   ❌ Email is NOT enabled")
    print("   Missing configuration:")
    if not config.SMTP_SERVER:
        print("      - SMTP_SERVER")
    if not config.SMTP_EMAIL:
        print("      - SMTP_EMAIL")
    if not config.SMTP_PASSWORD:
        print("      - SMTP_PASSWORD")
    sys.exit(1)
else:
    print("   ✅ Email is enabled")

print()

# Test 3: Test SMTP connection
print("3. Testing SMTP connection...")
import smtplib

try:
    print(f"   Connecting to {config.SMTP_SERVER}:{config.SMTP_PORT}...")
    with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT, timeout=10) as server:
        print("   ✅ Connected to SMTP server")

        print("   Starting TLS...")
        server.starttls()
        print("   ✅ TLS started")

        print("   Authenticating...")
        # Remove spaces from password (Gmail app passwords have spaces)
        password = config.SMTP_PASSWORD.replace(" ", "")
        server.login(config.SMTP_EMAIL, password)
        print("   ✅ Authentication successful")

except smtplib.SMTPAuthenticationError as e:
    print(f"   ❌ Authentication failed: {e}")
    print("   Check your email and password in .env file")
    print("   For Gmail, make sure you're using an App Password, not your regular password")
    sys.exit(1)
except smtplib.SMTPException as e:
    print(f"   ❌ SMTP error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"   ❌ Connection error: {e}")
    sys.exit(1)

print()

# Test 4: Send test email
print("4. Sending test email...")
send_test = input("   Do you want to send a test email to yourself? (yes/no): ").strip().lower()

if send_test == 'yes':
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "Test Email - Investment Framework"
        message["From"] = f"{config.SENDER_NAME} <{config.SMTP_EMAIL}>"
        message["To"] = config.SMTP_EMAIL

        text_body = """
Test Email from Investment Framework

This is a test email to verify your SMTP configuration is working correctly.

If you received this email, your email configuration is set up properly!

Best regards,
Investment Framework Team
        """

        html_body = """
        <html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Test Email from Investment Framework</h2>
                <p>This is a test email to verify your SMTP configuration is working correctly.</p>
                <p><strong>If you received this email, your email configuration is set up properly!</strong></p>
                <p>Best regards,<br>Investment Framework Team</p>
            </body>
        </html>
        """

        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)

        # Remove spaces from password
        password = config.SMTP_PASSWORD.replace(" ", "")

        with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
            server.starttls()
            server.login(config.SMTP_EMAIL, password)
            server.sendmail(config.SMTP_EMAIL, config.SMTP_EMAIL, message.as_string())

        print(f"   ✅ Test email sent successfully to {config.SMTP_EMAIL}")
        print(f"   Check your inbox (and spam folder)")

    except Exception as e:
        print(f"   ❌ Failed to send test email: {e}")
        sys.exit(1)

print()
print("="*70)
print("✅ EMAIL CONFIGURATION TEST COMPLETE")
print("="*70 + "\n")
