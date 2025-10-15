import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Eye,
  Receipt,
  FileText,
  Bell,
  DollarSign,
  Activity,
  Sparkles,
  Filter, 
  TrendingUp, 
  Target,
  BarChart3,
  PieChart,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, text: 'Checking...' });

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  // Check Indian market status
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      
      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffset);
      
      const day = istTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();
      const timeInMinutes = hours * 60 + minutes;
      
      // Market hours: Monday-Friday, 9:15 AM - 3:30 PM IST
      const marketOpen = 9 * 60 + 15;  // 9:15 AM = 555 minutes
      const marketClose = 15 * 60 + 30; // 3:30 PM = 930 minutes
      
      const isWeekday = day >= 1 && day <= 5; // Monday to Friday
      const isDuringMarketHours = timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
      
      if (isWeekday && isDuringMarketHours) {
        setMarketStatus({ isOpen: true, text: 'Markets Open' });
      } else if (isWeekday && timeInMinutes < marketOpen) {
        setMarketStatus({ isOpen: false, text: 'Pre-Market' });
      } else if (isWeekday && timeInMinutes > marketClose) {
        setMarketStatus({ isOpen: false, text: 'Markets Closed' });
      } else {
        setMarketStatus({ isOpen: false, text: 'Markets Closed' });
      }
    };

    checkMarketStatus();
    // Update every minute
    const interval = setInterval(checkMarketStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/watchlist', icon: Eye, label: 'Watchlist' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/dividends', icon: DollarSign, label: 'Dividends' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
    { path: '/performance', icon: Activity, label: 'Performance' },
    { path: '/backtesting', icon: TrendingUp, label: 'Backtest' },
    { path: '/ai-insights', icon: Sparkles, label: 'AI Insights' },
    { path: '/tax-report', icon: FileText, label: 'Tax Report' },
    { path: '/screener', icon: Filter, label: 'Screener' },
    { path: '/strategies', icon: Target, label: 'Strategies' },
    { path: '/analytics', icon: PieChart, label: 'Analytics' },
    { path: '/market', icon: BarChart3, label: 'Market' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl fixed h-screen">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" data-testid="app-title">InvestPro</h1>
              <p className="text-xs text-slate-400">Indian Markets</p>
            </div>
          </div>

          <nav className="space-y-2 flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-semibold text-lg">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Market Status - Bottom of sidebar */}
          <div className="mt-auto">
            <div className="glass-card p-4">
              <p className="text-xs text-slate-400 mb-2">NSE/BSE Market Status</p>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
                <span className={`text-sm font-medium ${marketStatus.isOpen ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {marketStatus.text}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">9:15 AM - 3:30 PM IST</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 h-screen overflow-y-auto">
        {/* Top Bar with User Profile */}
        <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-8 py-4 flex items-center justify-end">
            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 glass-card px-4 py-2">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;