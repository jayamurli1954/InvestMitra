# Cloud Deployment Environment Variables

This project should run with:
- `Frontend`: Vercel
- `Backend + WebSocket`: Render
- `Database`: MongoDB Atlas

## Backend (Render) required variables

Set these in Render service settings:

- `SECRET_KEY` = rotated JWT signing key
- `MONGO_URL` = your MongoDB Atlas connection string
- `DB_NAME` = production database name
- `FRONTEND_URL` = your Vercel frontend URL
- `ENVIRONMENT` = `production`
- `CORS_ORIGINS` = comma-separated allow-list (for example `https://investmitra.vercel.app,https://app.investmitra.com`)

Optional:

- `SMTP_SERVER`
- `SMTP_PORT`
- `SMTP_EMAIL`
- `SMTP_PASSWORD`
- `SENDER_NAME`
- `GEMINI_API_KEY`

Render start command:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

Alternative (uses bundled script):

```bash
python start_server.py
```

## Frontend (Vercel) required variables

Set these in Vercel project settings:

- `REACT_APP_API_BASE_URL` = Render backend URL (for example `https://investmitra-api.onrender.com`)

Optional:

- `REACT_APP_WS_BASE_URL` = Render websocket base (for example `wss://investmitra-api.onrender.com/ws`)
  - If omitted, frontend derives websocket URL from `REACT_APP_API_BASE_URL`.

## WebSocket routing

Keep all WebSocket connections pointed to Render backend:

- frontend connects to `wss://<render-backend>/ws/<user_id>`
- do not route `/ws/*` to Vercel Functions

## GitHub Actions CD secrets

Set these in GitHub repository settings at:
`Settings -> Secrets and variables -> Actions`

- `VERCEL_TOKEN` = Vercel access token
- `VERCEL_ORG_ID` = Vercel team/org ID
- `VERCEL_PROJECT_ID` = Vercel project ID for frontend
- `RENDER_DEPLOY_HOOK_URL` = Render deploy hook URL for backend service

The workflow `.github/workflows/deploy.yml` will:
1. Wait for `CI` to pass on `main`/`master`.
2. Deploy frontend to Vercel.
3. Trigger backend deploy on Render.
