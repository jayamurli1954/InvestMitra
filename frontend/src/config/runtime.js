const DEFAULT_API_BASE_URL = 'http://localhost:5500';

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const normalizeApiBaseUrl = (value) => {
    const stripped = stripTrailingSlash(value.trim());
    return stripped.endsWith('/api') ? stripped.slice(0, -4) : stripped;
};

const getApiBaseUrl = () => {
    const envValue = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;
    if (envValue && envValue.trim()) {
        return normalizeApiBaseUrl(envValue);
    }
    return DEFAULT_API_BASE_URL;
};

const buildDefaultWsBase = (apiBaseUrl) => {
    if (apiBaseUrl.startsWith('https://')) {
        return `${apiBaseUrl.replace('https://', 'wss://')}/ws`;
    }
    if (apiBaseUrl.startsWith('http://')) {
        return `${apiBaseUrl.replace('http://', 'ws://')}/ws`;
    }
    return `ws://localhost:5500/ws`;
};

const getWsBaseUrl = (apiBaseUrl) => {
    const envValue = process.env.REACT_APP_WS_BASE_URL || process.env.REACT_APP_WS_URL;
    if (envValue && envValue.trim()) {
        return stripTrailingSlash(envValue.trim());
    }
    return stripTrailingSlash(buildDefaultWsBase(apiBaseUrl));
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ROOT = `${API_BASE_URL}/api`;
export const WS_BASE_URL = getWsBaseUrl(API_BASE_URL);

export const apiUrl = (path = '') => `${API_ROOT}${path.startsWith('/') ? path : `/${path}`}`;
export const backendUrl = (path = '') => `${API_BASE_URL}${path.startsWith('/') || path === '' ? path : `/${path}`}`;
export const websocketUrl = (path = '') => `${WS_BASE_URL}${path.startsWith('/') || path === '' ? path : `/${path}`}`;
