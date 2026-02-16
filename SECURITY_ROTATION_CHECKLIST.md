# Secret Rotation Checklist

Use this once before production deployment.

1. Rotate backend `SECRET_KEY`.
2. Rotate SMTP credentials (`SMTP_EMAIL`, `SMTP_PASSWORD`).
3. Rotate `GEMINI_API_KEY`.
4. Rotate database credentials in `MONGO_URL` (create a new DB user/password in Atlas).
5. Set all rotated values in Render environment variables.
6. Set frontend runtime URLs in Vercel environment variables.
7. Confirm `backend/.env` is not committed and contains placeholders only.

## Verify after rotation

- Login/register works.
- Password reset email works.
- AI insights endpoint works.
- WebSocket ticker works over `wss://`.
