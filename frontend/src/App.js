import { useState, useEffect } from "react";
import "@/App.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import StaticMarketBar from "@/components/StaticMarketBar";
import logger from "@/utils/logger";

const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000';
export const API = `${BACKEND_URL}/api`;

// Configure axios to send credentials with every request
axios.defaults.withCredentials = true;

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
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </HashRouter>
  );
}

function App() {
  const [indices, setIndices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch indices, not major stocks (prevents rate limiting)
        const indicesRes = await axios.get(`${API}/market/overview`);
        setIndices(indicesRes.data);
      } catch (error) {
        logger.error('Error fetching market indices:', error);
      }
    };

    fetchData();

    // Refresh every 5 minutes (not too frequent to avoid rate limits)
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <div className="App">
        <AuthProvider>
          <StaticMarketBar indices={indices} />
          <AppRoutes />
        </AuthProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
