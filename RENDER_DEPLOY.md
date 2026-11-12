# Deploying InvestMitra on Render (backend) + Vercel (frontend)

The backend runs on Render as a **native Python service** (not the Dockerfile).

## Render backend settings
- **Root Directory:** `backend`
- **Build Command:** `bash build.sh`
  (installs `requirements.txt`, then `requirements-brokers.txt` so the Angel/Fyers
  SDKs are available — see `backend/build.sh`). To deploy *without* brokers, use
  `pip install -r requirements.txt`.
- **Start Command:** `python -m uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Python version:** pinned to 3.11.9 via `backend/runtime.txt` (the broker SDKs
  and their older AWS deps are not reliable on 3.14).

## Required environment variables (Render → Environment)
| Variable | Purpose |
|---|---|
| `MONGO_URL`, `DB_NAME` | database |
| `CORS_ORIGINS` | include `https://www.investmitra.sanmitratech.in` |
| `GEMINI_API_KEY` | AI Insights (Gemini) |
| `BROKER_ENC_KEY` | **required for broker connections** — a Fernet key; generate once, keep **secret and stable** (if it changes, stored broker credentials can't be decrypted). Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `FRONTEND_URL` | `https://www.investmitra.sanmitratech.in` (Fyers OAuth redirect-back) |
| `PRIMARY_PROVIDER` | `yfinance` (per-user brokers handle holdings) |
| `SECRET_KEY` | auth/JWT |

## Fyers OAuth (per user)
Each user registers this redirect URL in their Fyers app:
`https://www.investmitra.sanmitratech.in/api/broker/fyers/callback`

## Frontend (Vercel)
Set `REACT_APP_API_URL` to the Render backend URL (e.g. `https://investmitra-backend.onrender.com`).
