import "@/App.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import axios from "axios";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Portfolio from "@/pages/Portfolio";
import Screener from "@/pages/Screener";
import StockDetail from "@/pages/StockDetail";
import Strategies from "@/pages/Strategies";
import MarketOverview from "@/pages/MarketOverview";
import Analytics from "@/pages/Analytics";
import Watchlist from "@/pages/Watchlist";
import Transactions from "@/pages/Transactions";
import TaxReport from "@/pages/TaxReport";
import Alerts from "@/pages/Alerts";
import Dividends from "@/pages/Dividends";
import PerformanceReport from "@/pages/PerformanceReport";
import Backtesting from "@/pages/Backtesting";
import AIInsights from "@/pages/AIInsights";
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
import ProfileSettings from "@/pages/ProfileSettings";
import Disclaimer from "@/pages/Disclaimer";
import AboutUs from "@/pages/AboutUs";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000';
export const API = `${BACKEND_URL}/api`;
const AUTH_TOKEN_STORAGE_KEY = 'investmitra_access_token';

const getStoredAccessToken = () => {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

const clearStoredAccessToken = () => {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    // Ignore storage failures so auth flow still proceeds.
  }
};

// Configure axios interceptor for Authorization token

axios.interceptors.request.use(
  config => {
    const token = getStoredAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Intercept 401 Unauthorized errors to automatically log out users whose session has expired
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      clearStoredAccessToken();
      window.location.hash = '#/auth';
    }
    return Promise.reject(error);
  }
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/tax-report" element={<TaxReport />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/dividends" element={<Dividends />} />
                    <Route path="/performance" element={<PerformanceReport />} />
                    <Route path="/backtesting" element={<Backtesting />} />
                    <Route path="/ai-insights" element={<AIInsights />} />
                    <Route path="/screener" element={<Screener />} />
                    <Route path="/stock/:symbol" element={<StockDetail />} />
                    <Route path="/strategies" element={<Strategies />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/market" element={<MarketOverview />} />
                    <Route path="/profile-settings" element={<ProfileSettings />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                  </Routes>
                </Layout>
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </HashRouter>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}

export default App;

