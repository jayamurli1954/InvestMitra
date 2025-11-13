# Configuration Guide for Investment Framework

## Overview

The Investment Framework uses a centralized configuration system that validates environment variables and provides clear guidance for required vs. optional settings.

## Quick Start

### 1. Create your `.env` file

```bash
cd backend
cp .env.example .env
```

### 2. Configure Required Variables

Edit `backend/.env` and set these **required** variables:

```bash
# Generate a secure secret key
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# Then set it in .env:
SECRET_KEY=your-generated-secret-key

# MongoDB configuration
MONGO_URL=mongodb://localhost:27017  # or your MongoDB connection string
DB_NAME=investment_framework

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000
```

### 3. Start the Server

The server will:
- ✅ Validate all required variables are present
- ℹ️  Display helpful info about optional features
- ❌ Stop with clear error messages if required config is missing

## Environment Variables Reference

### Required Variables

These **must** be configured for the application to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | JWT secret key for authentication | Generate with: `python -c 'import secrets; print(secrets.token_urlsafe(32))'` |
| `MONGO_URL` | MongoDB connection URL | `mongodb://localhost:27017` or `mongodb+srv://...` |
| `DB_NAME` | MongoDB database name | `investment_framework` |
| `FRONTEND_URL` | Frontend URL for CORS and emails | `http://localhost:3000` |

### Optional Variables

These enable additional features when configured:

#### Email Features (Password Reset & Verification)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_SERVER` | SMTP server for sending emails | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port number | `587` (TLS) or `465` (SSL) |
| `SMTP_EMAIL` | Email address for sending | `your-email@gmail.com` |
| `SMTP_PASSWORD` | SMTP password or app-specific password | For Gmail: [Create App Password](https://support.google.com/accounts/answer/185833) |
| `SENDER_NAME` | Display name for sent emails | `Investment Framework` |

#### AI Features (Portfolio Analysis & Predictions)

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key for AI insights | Get from: https://makersuite.google.com/app/apikey |

## Configuration System Features

### 1. Clear Startup Messages

**Required variables missing:**
```
============================================================
❌ ERROR: REQUIRED ENVIRONMENT VARIABLES NOT CONFIGURED
============================================================

The application cannot start without these variables:

❌ SECRET_KEY
   Description: JWT secret key for authentication
   Setup: Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'

📝 TO FIX THIS:
   1. Copy backend/.env.example to backend/.env
   2. Fill in the required values above
   3. Restart the server
============================================================
```

**Optional features not configured:**
```
============================================================
ℹ️  OPTIONAL FEATURES NOT CONFIGURED
============================================================

Some optional features are disabled. Configure them to enable:

📦 Email notifications (password reset, verification):
   • SMTP_SERVER: SMTP server for sending emails
   • SMTP_PORT: SMTP port number
   • SMTP_EMAIL: Email address for sending emails
   • SMTP_PASSWORD: SMTP password or app-specific password

📦 AI-powered portfolio analysis and predictions:
   • GEMINI_API_KEY: Google Gemini API key for AI insights

💡 TO ENABLE THESE FEATURES:
   1. Edit backend/.env file
   2. Uncomment and fill in the optional variables you need
   3. Restart the server

   The application will work fine without these features.
============================================================
```

### 2. Feature Flags

The configuration system provides convenient feature checks:

```python
from config import config, is_email_enabled, is_ai_enabled

# Check if features are enabled
if is_email_enabled():
    send_email(...)

if is_ai_enabled():
    generate_insights(...)
```

### 3. Centralized Configuration

All modules import from the central config:

```python
from config import config

# Access configuration values
mongo_url = config.MONGO_URL
db_name = config.DB_NAME
api_key = config.GEMINI_API_KEY
```

## Troubleshooting

### Server won't start

**Error:** `Missing required environment variables: SECRET_KEY, MONGO_URL`

**Solution:** Create a `.env` file in the `backend/` directory with all required variables.

### Login not working

**Cause:** Missing `.env` file or `SECRET_KEY` not set

**Solution:**
1. Ensure `backend/.env` exists
2. Set `SECRET_KEY` to a secure random value
3. Restart the server

### Email features not working

**Cause:** SMTP variables not configured

**Solution:**
1. Uncomment SMTP variables in `.env`
2. For Gmail, create an [App Password](https://support.google.com/accounts/answer/185833)
3. Set `SMTP_EMAIL` and `SMTP_PASSWORD`
4. Restart the server

### AI features not working

**Cause:** `GEMINI_API_KEY` not configured

**Solution:**
1. Get a free API key from https://makersuite.google.com/app/apikey
2. Uncomment and set `GEMINI_API_KEY` in `.env`
3. Restart the server

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong SECRET_KEY** - Generate with `secrets.token_urlsafe(32)`
3. **Use App Passwords** - For Gmail, don't use your account password
4. **Rotate keys regularly** - Especially after team member changes
5. **Use different keys** - Different values for dev/staging/production

## Development vs Production

### Development
```bash
# backend/.env
MONGO_URL=mongodb://localhost:27017
FRONTEND_URL=http://localhost:3000
```

### Production
```bash
# backend/.env (or environment variables)
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
FRONTEND_URL=https://yourdomain.com
SECRET_KEY=production-secret-key  # Different from dev!
```

## Testing Configuration

To test your configuration without starting the full server:

```python
# Test config loading
python3 -c "from config import config; print('Config OK')"

# Check feature status
python3 -c "from config import is_email_enabled, is_ai_enabled; print(f'Email: {is_email_enabled()}, AI: {is_ai_enabled()}')"
```

## Support

If you encounter configuration issues:

1. Check the console output for detailed error messages
2. Verify `.env` file exists in `backend/` directory
3. Ensure all required variables are set
4. Check MongoDB is running and accessible
5. Review this guide for setup instructions
