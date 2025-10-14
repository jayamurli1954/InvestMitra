import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Dashboard from "@/pages/Dashboard";
import Portfolio from "@/pages/Portfolio";
import Screener from "@/pages/Screener";
import StockDetail from "@/pages/StockDetail";
import Strategies from "@/pages/Strategies";
import MarketOverview from "@/pages/MarketOverview";
import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/stock/:symbol" element={<StockDetail />} />
            <Route path="/strategies" element={<Strategies />} />
            <Route path="/market" element={<MarketOverview />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;