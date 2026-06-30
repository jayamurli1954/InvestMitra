import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
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
  User as UserIcon,
  Settings,
  Search,
  Zap,
  Building2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
} from "@/components/ui/command";
import InstallAppButton from "@/components/InstallAppButton";

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, text: 'Checking...' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  // Toggle Command Palette on Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
    { path: '/portfolio?tab=radar', icon: Target, label: 'Opportunity Radar' },
    { path: '/watchlist', icon: Eye, label: 'Watchlist' },
    { path: '/performance', icon: Activity, label: 'Performance' },
    { path: '/backtesting', icon: TrendingUp, label: 'Backtest' },
    { path: '/ai-insights', icon: Sparkles, label: 'AI Insights' },
    { path: '/screener', icon: Filter, label: 'Screener' },
    { path: '/strategies', icon: Target, label: 'Strategies' },
    { path: '/analytics', icon: PieChart, label: 'Analytics' },
  ];

  const popularStocks = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
    { symbol: 'INFY.NS', name: 'Infosys Limited' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
    { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  ];

  const handleSelectCommand = (action) => {
    setCommandOpen(false);
    action();
  };

  const sidebarContent = (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <img
            src="/icon-192.png"
            alt="InvestMitra logo"
            className="w-10 h-10 rounded-xl object-cover"
            loading="eager"
          />
          <div>
            <h1 className="text-xl font-bold text-white" data-testid="app-title">InvestMitra</h1>
            <p className="text-xs text-slate-400">Indian Markets</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden text-slate-300 hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
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
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
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
  );

  return (
    <div className="flex min-h-screen">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-black/30 backdrop-blur-xl transform transition-transform duration-200 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 self-start h-screen">
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto app-body-scroll">
        {/* Top Bar with Search & User Profile */}
        <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-slate-300 hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Terminal Command Trigger Search Bar */}
            <div className="flex-1 max-w-md">
              <button
                onClick={() => setCommandOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl glass-card text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all text-sm group"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Search pages, stocks, commands...</span>
                </div>
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-md">
                  <span>Ctrl</span> K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <InstallAppButton />
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center space-x-3 glass-card px-3 md:px-4 py-2 cursor-pointer">
                      {user.picture ? (
                        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-900 border-white/10 text-slate-200">
                    <DropdownMenuItem asChild>
                      <Link to="/profile-settings" className="cursor-pointer hover:bg-white/5">
                        <Settings className="w-4 h-4 mr-2" />
                        Profile Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-white/5 text-rose-400 focus:text-rose-400">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-8 pb-24 md:pb-12 min-h-full">
          {children}
        </div>

        {/* Global Command Palette Modal */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <div className="bg-slate-900 border border-white/10 text-slate-200 rounded-xl overflow-hidden shadow-2xl">
            <CommandInput placeholder="Type a command or search..." className="text-slate-100 placeholder:text-slate-500" />
            <CommandList className="max-h-[350px] p-2 bg-slate-900">
              <CommandEmpty className="text-slate-400 py-6 text-center text-sm">No results found.</CommandEmpty>
              
              <CommandGroup heading="Navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.path}
                      onSelect={() => handleSelectCommand(() => navigate(item.path))}
                      className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 flex items-center gap-3"
                    >
                      <Icon className="w-4 h-4 text-emerald-400" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator className="my-2 bg-white/10" />

              <CommandGroup heading="AI Actions & Analysis">
                <CommandItem
                  onSelect={() => handleSelectCommand(() => navigate('/ai-insights'))}
                  className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 flex items-center gap-3"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Run AI Accumulate/Hold/Reduce Signal</span>
                  <CommandShortcut>AI</CommandShortcut>
                </CommandItem>
                <CommandItem
                  onSelect={() => handleSelectCommand(() => navigate('/backtesting'))}
                  className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 flex items-center gap-3"
                >
                  <Zap className="w-4 h-4 text-sky-400" />
                  <span>Run Quantitative Strategy Backtest</span>
                </CommandItem>
              </CommandGroup>

              <CommandSeparator className="my-2 bg-white/10" />

              <CommandGroup heading="Popular NSE Stocks">
                {popularStocks.map((stock) => (
                  <CommandItem
                    key={stock.symbol}
                    onSelect={() => handleSelectCommand(() => navigate(`/stock/${stock.symbol}`))}
                    className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      <span>{stock.name}</span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {stock.symbol}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        </CommandDialog>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-slate-900/60 px-4 md:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/about-us"
                className="px-3 py-1.5 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 text-sm"
              >
                About Us
              </Link>
              <Link
                to="/privacy-policy"
                className="px-3 py-1.5 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-and-conditions"
                className="px-3 py-1.5 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 text-sm"
              >
                Terms & Conditions
              </Link>
              <Link
                to="/disclaimer"
                className="px-3 py-1.5 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 text-sm"
              >
                Legal Disclaimer
              </Link>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p>(c) {new Date().getFullYear()} InvestMitra. All rights reserved.</p>
              <p>For educational purposes only. Not investment advice.</p>
              <p className="mt-2 text-[10px] text-slate-500/70">Version v1.0.0</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Layout;


