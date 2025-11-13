"""
Simple Email Test - Direct SMTP Test
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

print("\n" + "="*70)
print("📧 SIMPLE EMAIL TEST")
print("="*70 + "\n")

# Configuration from your .env file
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_EMAIL = "jayamurli1954@gmail.com"
SMTP_PASSWORD = "tnhc nbcu qfsz plwo"  # Gmail app password with spaces
SENDER_NAME = "Investment Framework"

print("Configuration:")
print(f"   SMTP Server: {SMTP_SERVER}:{SMTP_PORT}")
print(f"   Email: {SMTP_EMAIL}")
print(f"   Password: {'*' * 16}")
print()

# Test 1: Connection
print("1. Testing SMTP connection...")
try:
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
    print("   ✅ Connected to SMTP server")

    server.starttls()
    print("   ✅ TLS started")

    # Remove spaces from password (important for Gmail app passwords!)
    password = SMTP_PASSWORD.replace(" ", "")
    print(f"   Password without spaces: {'*' * len(password)}")

    server.login(SMTP_EMAIL, password)
    print("   ✅ Authentication successful!")

    server.quit()
    print()

except smtplib.SMTPAuthenticationError as e:
    print(f"   ❌ Authentication failed: {e}")
    print("   Possible issues:")
    print("      - App password might be incorrect")
    print("      - 2-Step Verification not enabled on Gmail")
    print("      - Using regular password instead of app password")
    exit(1)

except Exception as e:
    print(f"   ❌ Connection error: {e}")
    exit(1)

# Test 2: Send test email
print("2. Sending test email...")
try:
    message = MIMEMultipart("alternative")
    message["Subject"] = "🧪 Test Email - Investment Framework"
    message["From"] = f"{SENDER_NAME} <{SMTP_EMAIL}>"
    message["To"] = SMTP_EMAIL

    text_body = """
Test Email from Investment Framework

✅ Your email configuration is working correctly!

If you received this email, the password reset functionality should work.

Best regards,
Investment Framework
    """

    html_body = """
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ Test Email from Investment Framework</h2>
            <p><strong>Your email configuration is working correctly!</strong></p>
            <p>If you received this email, the password reset functionality should work.</p>
            <p>Best regards,<br>Investment Framework Team</p>
        </body>
    </html>
    """

    part1 = MIMEText(text_body, "plain")
    part2 = MIMEText(html_body, "html")
    message.attach(part1)
    message.attach(part2)

    # Send email
    password = SMTP_PASSWORD.replace(" ", "")
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, password)
        server.sendmail(SMTP_EMAIL, SMTP_EMAIL, message.as_string())

    print(f"   ✅ Test email sent to {SMTP_EMAIL}")
    print()
    print("📬 CHECK YOUR EMAIL:")
    print("   - Check inbox: jayamurli1954@gmail.com")
    print("   - Also check SPAM/Junk folder")
    print("   - Subject: 🧪 Test Email - Investment Framework")

except Exception as e:
    print(f"   ❌ Failed to send: {e}")
    exit(1)

print()
print("="*70)
print("✅ ALL TESTS PASSED - EMAIL IS WORKING!")
print("="*70 + "\n")
