import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TrendingUp, Shield, Brain, PieChart, LineChart, Cpu, Zap, Award, CheckCircle, 
  ArrowRight, Layers, Lock, Sparkles, ChevronRight, HelpCircle, UserCheck, BarChart3, 
  RefreshCw, DollarSign, FileText, Check, X, AlertTriangle, Play, MessageSquare, Globe, Smartphone, ChevronDown
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' | 'annual'
  const [activeTab, setActiveTab] = useState('allocation');
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedAiQuery, setSelectedAiQuery] = useState(0);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [displayedAiResponse, setDisplayedAiResponse] = useState('');

  const sampleAiQueries = [
    {
      query: "Analyze my portfolio risk & diversification",
      response: "📊 Portfolio Risk Analysis: Your portfolio currently has a high concentration (42%) in Indian Technology equities (TCS, Infosys). Volatility beta is 1.15. Recommendation: Consider rebalancing 10% into Banking & Consumer Defensive sectors or Nifty BeES to optimize Sharpe Ratio."
    },
    {
      query: "What is my estimated LTCG tax liability this fiscal year?",
      response: "💰 Tax Insights (FY 2025-26): Estimated Long Term Capital Gains: ₹1,45,000. Under current Indian IT rules, gains up to ₹1.25 Lakh are tax-exempt. Estimated net taxable LTCG is ₹20,000 @ 12.5% = ₹2,500 tax liability. Consider tax-harvesting ₹20k from underperforming holdings before March 31."
    },
    {
      query: "Why did my technology allocation drop this month?",
      response: "📉 Sector Movement: Your Tech allocation dropped from 45% to 38% due to a 6.2% broad-market correction in Nifty IT index following global tech guidance revisions, while your Banking holdings (HDFC Bank, ICICI) surged +4.8% after strong quarterly earnings."
    },
    {
      query: "Suggest high-yield dividend stocks to review",
      response: "🎯 Dividend Intelligence: Top fundamentally strong Indian dividend yielders meeting your criteria: 1) Coal India (Yld: ~7.8%), 2) Power Grid (Yld: ~4.5%), 3) ITC (Yld: ~3.8%). Note: Always analyze payout sustainability & dividend coverage ratios."
    }
  ];

  useEffect(() => {
    setIsAiTyping(true);
    setDisplayedAiResponse('');
    let currentText = sampleAiQueries[selectedAiQuery].response;
    let index = 0;
    const timer = setInterval(() => {
      if (index < currentText.length) {
        setDisplayedAiResponse(prev => prev + currentText.charAt(index));
        index++;
      } else {
        setIsAiTyping(false);
        clearInterval(timer);
      }
    }, 15);
    return () => clearInterval(timer);
  }, [selectedAiQuery]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      
      {/* 1. STICKY NAVIGATION */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-slate-950 font-bold" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Invest<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Mitra</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-emerald-400 transition-colors">Solutions</a>
            <a href="#ai-assistant" className="hover:text-emerald-400 transition-colors">AI Assistant</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/auth')}
              className="text-slate-300 hover:text-white font-medium text-sm px-4 py-2 transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/auth')}
              className="relative group overflow-hidden rounded-xl p-px font-semibold text-sm shadow-xl"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 group-hover:opacity-90 transition-opacity"></span>
              <span className="relative block px-5 py-2.5 rounded-[11px] bg-slate-950 text-white font-medium transition-all group-hover:bg-transparent">
                Get Started Free
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden">
        {/* Glowing Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-500/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-medium mb-8 shadow-inner shadow-emerald-500/10 animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>AI-Powered Investment Intelligence for Indian Markets</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.15] max-w-5xl mx-auto">
            Invest Smarter. Understand Better. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Grow with Confidence.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-8 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Track your investments across NSE & BSE stocks and mutual funds, analyze portfolio risk, backtest algorithmic strategies, and receive institutional-grade AI insights—all in one compliant platform.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
              <span>Start Free Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a 
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-semibold text-base transition-all flex items-center justify-center space-x-2"
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-400 font-medium">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Bank-Grade 256-bit Encryption</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>SEBI Guidelines Aware</span>
            </div>
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              <span>Real-Time AI Analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Built for Indian Markets (NSE/BSE)</span>
            </div>
          </div>

          {/* Dashboard Preview Widget */}
          <div className="mt-16 relative mx-auto max-w-6xl rounded-2xl p-2 sm:p-4 bg-gradient-to-b from-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl">
            <div className="rounded-xl bg-slate-950 p-4 sm:p-6 overflow-hidden border border-slate-800 text-left">
              
              {/* Header Bar of Mockup */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400 hidden sm:inline">investmitra-workstation.app v2.4</span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    ● NIFTY 50: 24,350 (+0.85%)
                  </span>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    ● SENSEX: 79,920 (+0.78%)
                  </span>
                </div>
              </div>

              {/* Grid Mockup Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                
                {/* Stat Card 1 */}
                <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs font-medium text-slate-400">Total Portfolio Value</p>
                  <h3 className="text-2xl font-black text-white mt-1">₹ 24,85,420<span className="text-xs text-slate-400 font-normal">.50</span></h3>
                  <div className="mt-2 flex items-center text-xs font-bold text-emerald-400 space-x-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+₹ 4,92,100 (+24.6% Overall)</span>
                  </div>
                </div>

                {/* Stat Card 2 */}
                <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs font-medium text-slate-400">AI Portfolio Health Score</p>
                  <div className="flex items-center justify-between mt-1">
                    <h3 className="text-2xl font-black text-emerald-400">92 / 100</h3>
                    <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded bg-emerald-500/20 text-emerald-300">Strong</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1.5 rounded-full w-[92%]" />
                  </div>
                </div>

                {/* Stat Card 3 */}
                <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                  <p className="text-xs font-medium text-slate-400">Estimated Dividend Yield</p>
                  <h3 className="text-2xl font-black text-white mt-1">3.45% <span className="text-xs text-slate-400 font-normal">p.a.</span></h3>
                  <p className="text-xs text-slate-400 mt-2">Next Payout: ₹4,200 on July 14</p>
                </div>
              </div>

              {/* Mini AI Insight Bar inside mockup */}
              <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs text-slate-200">
                  <Brain className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>InvestMitra AI Alert:</strong> Technology allocation is currently 42%. Consider tax harvesting ₹15,000 LTCG gains before year-end.</span>
                </div>
                <button 
                  onClick={() => navigate('/auth')} 
                  className="hidden sm:block text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 whitespace-nowrap ml-4"
                >
                  View Analysis →
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. TRUSTED METRICS */}
      <section className="py-12 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">50,000+</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">Indian Investors</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400">₹1,200 Cr+</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">Portfolios Tracked</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">4,000+</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">Stocks & Funds Tracked</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">1.5M+</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">AI Insights Generated</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY INVESTMITRA */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Core Capabilities</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
              Why Serious Indian Investors Choose InvestMitra
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Moving beyond spreadsheets. Engineered to give individual retail investors and wealth advisors institutional-grade portfolio intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            
            {/* Card 1 */}
            <div className="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <PieChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Portfolio Tracking</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Consolidate stocks across NSE/BSE and mutual funds into unified views. Track real-time CAGR, absolute returns, and cash flows seamlessly.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Investment Insights Engine</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Receive natural-language explanations of portfolio movements, sector concentration warnings, and automated risk diagnostics powered by AI.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-110 transition-transform">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Algorithmic Backtesting</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Test custom trading strategies against 10+ years of historical Indian market data. Evaluate Sharpe ratios, max drawdowns, and win rates.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Risk & Sector Health Analytics</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Monitor beta risk, cap-weight distribution (Large, Mid, Small), and sector concentrations to prevent market volatility surprises.
              </p>
            </div>

            {/* Card 5 */}
            <div className="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tax Reports & Dividends</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Generate LTCG and STCG tax reports aligned with Indian Income Tax rules. Track dividend yields and scheduled upcoming payouts automatically.
              </p>
            </div>

            {/* Card 6 */}
            <div className="group p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Multi-Portfolio Support</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Manage distinct portfolios for long-term wealth, retirement, trading, and family members under a single unified dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. PLATFORM OVERVIEW (INTERACTIVE SHOWCASE) */}
      <section id="solutions" className="py-24 bg-slate-900/40 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Interactive Workstation</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
              Powerful Tools Built for Clarity
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Experience how InvestMitra turns complex market data into actionable visual insights.
            </p>
          </div>

          {/* Interactive Showcase Container */}
          <div className="mt-12 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            
            {/* Navigation Tabs */}
            <div className="flex flex-wrap border-b border-slate-800 bg-slate-900/80 p-2 gap-2">
              <button 
                onClick={() => setActiveTab('allocation')}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'allocation' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <PieChart className="w-4 h-4" />
                <span>Sector Breakdown</span>
              </button>

              <button 
                onClick={() => setActiveTab('risk')}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'risk' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Risk Diagnostics</span>
              </button>

              <button 
                onClick={() => setActiveTab('performance')}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'performance' 
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Performance & Gains</span>
              </button>
            </div>

            {/* Tab Content Panels */}
            <div className="p-6 sm:p-10 min-h-[360px] flex items-center">
              {activeTab === 'allocation' && (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Asset Allocation</span>
                    <h3 className="text-2xl font-bold text-white mt-1">Balanced Diversification Across Indian Sectors</h3>
                    <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                      Visualize your exposure across Banking, Technology, Auto, Pharma, and Consumer Goods. Instantly identify over-concentration in specific stocks before market downturns.
                    </p>
                    <ul className="mt-6 space-y-2 text-xs sm:text-sm text-slate-300">
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Automatic Market Cap Split (Large vs Mid vs Small Cap)</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Real-time rebalancing alert triggers</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-300">Technology (TCS, INFY)</span>
                      <span className="text-emerald-400">38%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-2 w-[38%]" /></div>
                    
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-300">Financial Services (HDFC, ICICI)</span>
                      <span className="text-cyan-400">28%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-cyan-400 h-2 w-[28%]" /></div>

                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-300">Automobile (Tata Motors, M&M)</span>
                      <span className="text-teal-400">18%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className="bg-teal-400 h-2 w-[18%]" /></div>
                  </div>
                </div>
              )}

              {activeTab === 'risk' && (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Volatility & Beta</span>
                    <h3 className="text-2xl font-bold text-white mt-1">Institutional Risk Diagnostics</h3>
                    <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                      Understand how your portfolio behaves during Nifty volatility. InvestMitra measures Portfolio Beta, Value at Risk (VaR), and Max Historical Drawdowns.
                    </p>
                    <div className="mt-6 flex items-center space-x-4">
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <p className="text-[11px] text-slate-400">Portfolio Beta</p>
                        <p className="text-lg font-bold text-white">1.04 <span className="text-xs text-emerald-400">(Optimal)</span></p>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <p className="text-[11px] text-slate-400">Sharpe Ratio</p>
                        <p className="text-lg font-bold text-emerald-400">1.85</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 text-center">
                    <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h4 className="text-lg font-bold text-white">Risk Rating: Low-Moderate</h4>
                    <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">Your asset distribution is well-buffered against benchmark drawdowns.</p>
                  </div>
                </div>
              )}

              {activeTab === 'performance' && (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fade-in">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Realized & Unrealized Returns</span>
                    <h3 className="text-2xl font-bold text-white mt-1">Benchmark-Beating Performance Reports</h3>
                    <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                      Compare your portfolio returns against Nifty 50, Nifty Next 50, and SENSEX benchmark indices over 1Y, 3Y, and 5Y horizons.
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 space-y-3">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-semibold text-white">Your Portfolio (CAGR)</span>
                      <span className="text-sm font-bold text-emerald-400">+24.6%</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-400">NIFTY 50 Benchmark</span>
                      <span className="text-sm font-bold text-slate-300">+14.2%</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-400">SENSEX Benchmark</span>
                      <span className="text-sm font-bold text-slate-300">+13.8%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* 7. AI SECTION (INTERACTIVE DEMO) */}
      <section id="ai-assistant" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Explanation Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <Brain className="w-3.5 h-3.5" />
                <span>Next-Gen AI Companion</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Meet Your AI Investment Assistant
              </h2>
              <p className="text-slate-400 text-base leading-relaxed">
                Ask natural questions about your investments in plain English. InvestMitra AI scans historical pattern databases, regulatory guidelines, and corporate announcements to deliver actionable clarity.
              </p>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Try clicking a sample prompt below:</p>
                {sampleAiQueries.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAiQuery(idx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between ${
                      selectedAiQuery === idx 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>"{item.query}"</span>
                    <ChevronRight className={`w-4 h-4 ${selectedAiQuery === idx ? 'text-emerald-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Right Interactive Chat Box Column */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
                
                {/* Chat Header */}
                <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">InvestMitra Intelligence Bot</h4>
                    <p className="text-[11px] text-emerald-400 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                      Online & Connected to Indian Market Feed
                    </p>
                  </div>
                </div>

                {/* Chat Body */}
                <div className="mt-6 space-y-4 min-h-[260px]">
                  
                  {/* User Message Bubble */}
                  <div className="flex justify-end">
                    <div className="bg-emerald-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs sm:text-sm max-w-[85%] font-medium shadow-md">
                      {sampleAiQueries[selectedAiQuery].query}
                    </div>
                  </div>

                  {/* AI Response Bubble */}
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-slate-950 border border-slate-800 text-slate-200 p-4 rounded-2xl rounded-tl-none text-xs sm:text-sm leading-relaxed max-w-[90%] shadow-inner">
                      {displayedAiResponse}
                      {isAiTyping && <span className="inline-block w-1.5 h-4 bg-emerald-400 ml-1 animate-pulse" />}
                    </div>
                  </div>

                </div>

                {/* Fake Input Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center space-x-2">
                  <input 
                    type="text" 
                    disabled 
                    placeholder="Ask AI anything about your portfolio or stocks..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 focus:outline-none cursor-not-allowed"
                  />
                  <button 
                    onClick={() => navigate('/auth')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors whitespace-nowrap"
                  >
                    Try Live
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 8. BUILT FOR INDIAN INVESTORS */}
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3">
              <span>🇮🇳 Tailored for Bharat</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Built Specifically for Indian Market Workflows</h2>
            <p className="text-slate-400 text-base mt-3">
              We understand capital gains tax laws, dividend cycles, and exchange regulations in India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-14 text-left">
            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
              <h4 className="text-base font-bold text-white mb-2">NSE & BSE Coverage</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Full historical data support for equities, indices, and sector benchmarks on National & Bombay Stock Exchanges.</p>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
              <h4 className="text-base font-bold text-white mb-2">LTCG / STCG Tax Calculations</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Automatic grandfathering calculations and capital gains segmentation in compliance with Indian Union Budgets.</p>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
              <h4 className="text-base font-bold text-white mb-2">Indian Mutual Funds</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Track equity, debt, and hybrid mutual fund NAVs along with your direct stock portfolio in one dashboard.</p>
            </div>
            <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
              <h4 className="text-base font-bold text-white mb-2">INR (₹) Dividend Tracking</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Monitor corporate action updates, ex-dividend dates, and dividend income credited to your bank account.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 9. WHY IT IS DIFFERENT (COMPARISON TABLE) */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Clear Comparison</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">InvestMitra vs Traditional Alternatives</p>
          </div>

          <div className="mt-14 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-xs text-slate-400 uppercase">
                  <th className="py-4 px-6 font-bold">Feature</th>
                  <th className="py-4 px-6 font-bold text-emerald-400 text-sm bg-emerald-950/30">InvestMitra AI</th>
                  <th className="py-4 px-6 font-bold">Spreadsheets / Excel</th>
                  <th className="py-4 px-6 font-bold">Basic Trackers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">AI Natural Language Insights</td>
                  <td className="py-4 px-6 bg-emerald-950/20 text-emerald-400 font-bold"><Check className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-slate-500"><X className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-slate-500"><X className="w-5 h-5" /></td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Indian Tax Harvesting Reports</td>
                  <td className="py-4 px-6 bg-emerald-950/20 text-emerald-400 font-bold"><Check className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-slate-400">Manual Formulas</td>
                  <td className="py-4 px-6 text-slate-500"><X className="w-5 h-5" /></td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Algorithmic Backtesting Simulator</td>
                  <td className="py-4 px-6 bg-emerald-950/20 text-emerald-400 font-bold"><Check className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-slate-500"><X className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-slate-500"><X className="w-5 h-5" /></td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Automatic Price & Market Updates</td>
                  <td className="py-4 px-6 bg-emerald-950/20 text-emerald-400 font-bold"><Check className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-slate-400">Broken Macros</td>
                  <td className="py-4 px-6 text-emerald-400"><Check className="w-5 h-5" /></td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-semibold text-white">Bank-Grade Encryption & Cloud Sync</td>
                  <td className="py-4 px-6 bg-emerald-950/20 text-emerald-400 font-bold"><Check className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-slate-500"><X className="w-5 h-5" /></td>
                  <td className="py-4 px-6 text-emerald-400"><Check className="w-5 h-5" /></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* 10. WHO IS IT FOR */}
      <section className="py-20 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Tailored Solutions</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white">Designed for Every Phase of Your Wealth Journey</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition-all">
              <UserCheck className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Retail Investors</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">Consolidate disparate demat holdings and gain instant clarity without getting overwhelmed by complex technical jargon.</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition-all">
              <TrendingUp className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Swing & Value Traders</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">Backtest quantitative entry/exit rules against historical Nifty trends before deploying capital into live markets.</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition-all">
              <Shield className="w-8 h-8 text-teal-400 mb-4" />
              <h3 className="text-lg font-bold text-white">Wealth Managers & Advisory</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">Manage multi-client asset allocations, prepare institutional PDF reports, and deliver AI-assisted portfolio reviews.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 13. PRICING SECTION */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Transparent Pricing</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">Simple Plans. Massive Value.</p>
            <p className="mt-4 text-slate-400 text-base">Start free and upgrade as your portfolio and analytics requirements grow.</p>
            
            {/* Monthly / Annual Toggle */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  billingCycle === 'monthly' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button 
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  billingCycle === 'annual' ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] uppercase bg-slate-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono">20% OFF</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 items-stretch">
            
            {/* Plan 1: Starter */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-slate-400 text-xs mt-1">Ideal for individual beginners tracking personal portfolios.</p>
                <div className="mt-6">
                  <span className="text-4xl font-black text-white">₹0</span>
                  <span className="text-xs text-slate-400 font-medium ml-1">/ forever free</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Up to 1 Portfolio</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Stock & Mutual Fund Tracking</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Basic Risk Diagnostics</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>AI Insights Lite (5 queries/mo)</span></li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/auth')}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Start Free
              </button>
            </div>

            {/* Plan 2: Professional (HIGHLIGHTED) */}
            <div className="rounded-2xl bg-slate-900 border-2 border-emerald-500/80 p-8 flex flex-col justify-between relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Professional</h3>
                <p className="text-slate-400 text-xs mt-1">For serious active investors needing deep AI analytics & tax reports.</p>
                <div className="mt-6">
                  <span className="text-4xl font-black text-white">
                    {billingCycle === 'annual' ? '₹399' : '₹499'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">/ month</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs text-slate-200">
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Unlimited Portfolios</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Full AI Research Assistant Access</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Algorithmic Backtesting Simulator</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>LTCG/STCG Tax Harvesting Reports</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Real-Time Price & Alert Notifications</span></li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/auth')}
                className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                Get Professional
              </button>
            </div>

            {/* Plan 3: Enterprise */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <p className="text-slate-400 text-xs mt-1">Custom solutions for Wealth Managers, Advisory Firms & Family Offices.</p>
                <div className="mt-6">
                  <span className="text-3xl font-black text-white">Custom</span>
                </div>
                <ul className="mt-8 space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Multi-Client CRM Dashboard</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Custom Branding & PDF Export</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>Dedicated Account Manager</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-4 h-4 text-emerald-400" /><span>API & Webhook Access</span></li>
                </ul>
              </div>
              <button 
                onClick={() => navigate('/auth')}
                className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Contact Sales
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 15. FAQ SECTION */}
      <section id="faq" className="py-24 bg-slate-900/30 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Got Questions?</h2>
            <p className="mt-2 text-3xl font-black text-white">Frequently Asked Questions</p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              { q: "Is InvestMitra free to use?", a: "Yes! InvestMitra offers a free Starter plan that includes portfolio tracking, stock monitoring, and basic analytics. You can upgrade to Professional whenever you require unlimited backtesting and deep AI research." },
              { q: "Does InvestMitra provide SEBI registered investment advice?", a: "No. InvestMitra is strictly an investment analytics, portfolio tracking, and software tool. It is not a SEBI-registered advisor and does not provide buy/sell stock tips or financial recommendations." },
              { q: "How secure is my financial data on InvestMitra?", a: "Your data security is our top priority. We use bank-grade 256-bit SSL encryption, isolated database sessions, and cloud infrastructure compliance to ensure your portfolio details remain confidential." },
              { q: "Does it support both NSE and BSE stocks?", a: "Yes! InvestMitra tracks prices and historical data for equities traded across both the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE), as well as Indian mutual funds." },
              { q: "Can I generate tax harvesting reports for Indian Income Tax?", a: "Yes. InvestMitra automatically categorizes long-term (LTCG) and short-term (STCG) capital gains in accordance with current Indian tax slabs, helping you optimize capital gains before the financial year ends." }
            ].map((item, idx) => (
              <div key={idx} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-semibold text-sm text-white flex justify-between items-center hover:bg-slate-800/50 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="p-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 14. COMPLIANCE & LEGAL DISCLAIMER BOX */}
      <section className="py-10 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs leading-relaxed flex flex-col md:flex-row items-start space-y-3 md:space-y-0 md:space-x-4">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300 text-sm mb-1">SEBI Regulatory Compliance & Regulatory Disclaimer</p>
              <p>
                InvestMitra is an investment analytics, portfolio management, and quantitative software platform. 
                <strong> InvestMitra is NOT a SEBI-registered investment advisor, broker, or research analyst.</strong> Nothing contained on this platform constitutes financial advice, stock recommendations, or an offer to buy/sell securities. All market data, AI insights, and backtest simulations are generated for educational and analytical purposes only. Please perform your own due diligence or consult a qualified financial advisor before investing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 15. FINAL CTA BANNER */}
      <section className="py-20 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-t border-slate-800 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Ready to Invest Smarter & Grow with Confidence?</h2>
          <p className="mt-4 text-slate-300 text-base max-w-2xl mx-auto">
            Join thousands of Indian investors taking control of their portfolio intelligence today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/auth')}
              className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 transition-all"
            >
              Start Free Today
            </button>
            <button 
              onClick={() => navigate('/auth')}
              className="px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-base transition-all"
            >
              Launch Live App →
            </button>
          </div>
        </div>
      </section>

      {/* 16. FOOTER */}
      <footer className="bg-slate-950 py-12 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-800/80">
            
            <div className="col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-slate-950 font-bold" />
                </div>
                <span className="text-xl font-extrabold text-white">Invest<span className="text-emerald-400">Mitra</span></span>
              </div>
              <p className="text-slate-400 max-w-sm">Your Intelligent Investment Companion for Indian Markets. AI-driven portfolio tracking, backtesting, and analytics.</p>
              <p className="text-slate-500 text-[11px]">© 2026 InvestMitra Tech Solutions. All rights reserved.</p>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Product</p>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-emerald-400 transition-colors">Portfolio Tracking</a></li>
                <li><a href="#ai-assistant" className="hover:text-emerald-400 transition-colors">AI Research Assistant</a></li>
                <li><a href="#solutions" className="hover:text-emerald-400 transition-colors">Backtesting Engine</a></li>
                <li><a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing Plans</a></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Company & Legal</p>
              <ul className="space-y-2">
                <li><Link to="/about-us" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms-and-conditions" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/disclaimer" className="hover:text-emerald-400 transition-colors">SEBI Disclaimer</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Support</p>
              <ul className="space-y-2">
                <li><a href="mailto:support@sanmitratech.in" className="hover:text-emerald-400 transition-colors">support@sanmitratech.in</a></li>
                <li><a href="https://www.investmitra.sanmitratech.in" className="hover:text-emerald-400 transition-colors">sanmitratech.in</a></li>
                <li><span className="text-emerald-400">Status: Operational</span></li>
              </ul>
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
