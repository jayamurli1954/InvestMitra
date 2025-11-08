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
import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import Marquee from "@/components/Marquee";

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
  const [majorStocks, setMajorStocks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [indicesRes, majorStocksRes] = await Promise.all([
          axios.get(`${API}/market/overview`),
          axios.get(`${API}/market/major-stocks`)
        ]);
        setIndices(indicesRes.data);
        setMajorStocks(majorStocksRes.data);
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="App">
      <AuthProvider>
        <Marquee items={indices} />
        <Marquee items={majorStocks} />
        <AppRoutes />
      </AuthProvider>
    </div>
  );
}

export default App;
