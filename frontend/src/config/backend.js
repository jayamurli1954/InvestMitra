/**
 * Backend API + WebSocket base URLs.
 *
 * Set in frontend/.env (copy from .env.example):
 *   REACT_APP_API_URL=http://127.0.0.1:9001
 *
 * WebSocket URL is derived automatically (http→ws, https→wss).
 * Optional override: REACT_APP_WS_URL=ws://127.0.0.1:9001
 */

const DEFAULT_BACKEND_URL = 'http://127.0.0.1:9001';

function normalizeBackendUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_BACKEND_URL;
  }
  return raw.trim().replace(/\/api\/?$/i, '').replace(/\/$/, '');
}

export const BACKEND_URL = normalizeBackendUrl(process.env.REACT_APP_API_URL);

export const API = `${BACKEND_URL}/api`;

export function getWebSocketBaseUrl() {
  const explicit = process.env.REACT_APP_WS_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  try {
    const url = new URL(BACKEND_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.origin;
  } catch {
    return 'ws://127.0.0.1:9001';
  }
}
