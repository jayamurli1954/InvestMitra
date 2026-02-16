import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import Ticker from '@/components/dashboard/Ticker';
import AddHoldingModal from '@/components/dashboard/modals/AddHoldingModal';
import AddWatchlistModal from '@/components/dashboard/modals/AddWatchlistModal';
import { apiUrl, backendUrl } from '@/config/runtime';
import {
    LayoutDashboard,
    Wallet,
    TrendingUp,
    Zap,
    Settings,
    LogOut,
    Database,
    Menu,
    List,
    History,
    FileText,
    PieChart,
    BookOpen,
    HelpCircle,
    Calculator,
    FlaskConical,
    Layers,
    Plus
} from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [backendStatus, setBackendStatus] = useState("Checking...");
    const [dbMode, setDbMode] = useState("Unknown");
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Modal States
    const [isAddHoldingOpen, setIsAddHoldingOpen] = useState(false);
    const [isAddWatchlistOpen, setIsAddWatchlistOpen] = useState(false);

    // Form States
    const [holdingForm, setHoldingForm] = useState({ symbol: '', quantity: '', buy_price: '' });
    const [watchlistForm, setWatchlistForm] = useState({ symbol: '' });

    useEffect(() => {
        fetch(backendUrl('/'))
            .then(res => res.json())
            .then(data => {
                setBackendStatus(data.status || "Online");
                setDbMode(data.db_mode || "Checking...");
            })
            .catch(err => {
                setBackendStatus("Offline");
                setDbMode("Unknown");
            });
    }, []);

    const handleSaveHolding = async () => {
        if (!holdingForm.symbol) return alert("Please select a stock symbol");

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(apiUrl('/portfolio/holdings'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(holdingForm)
            });
            if (response.ok) {
                alert("Holding Added Successfully!");
                setIsAddHoldingOpen(false);
                setHoldingForm({ symbol: '', quantity: '', buy_price: '' });
            } else {
                alert("Failed to add holding.");
            }
        } catch (error) {
            console.error("Error saving holding:", error);
            alert("Error saving holding.");
        }
    };

    const handleSaveWatchlist = async () => {
        if (!watchlistForm.symbol) return alert("Please select a stock symbol");

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(apiUrl('/watchlist'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(watchlistForm)
            });
            if (response.ok) {
                alert("Added to Watchlist!");
                setIsAddWatchlistOpen(false);
                setWatchlistForm({ symbol: '' });
            } else {
                alert("Failed to add to watchlist.");
            }
        } catch (error) {
            console.error("Error saving watchlist:", error);
            alert("Error saving watchlist.");
        }
    };

    const navItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'portfolio', label: 'My Portfolio', icon: Wallet },
        { id: 'watchlist', label: 'Watchlist', icon: List },
        { id: 'market', label: 'Market Trends', icon: TrendingUp },
        { id: 'insights', label: 'AI Insights', icon: Zap },
        { id: 'transactions', label: 'Transactions', icon: History },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'tax', label: 'Tax Planning', icon: Calculator },
        { id: 'budget', label: 'Budgeting', icon: PieChart },
        { id: 'strategy', label: 'Strategy Builder', icon: Layers },
        { id: 'backtest', label: 'Backtesting', icon: FlaskConical },
        { id: 'learn', label: 'Learn', icon: BookOpen },
        { id: 'support', label: 'Support', icon: HelpCircle },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        {/* Portfolio Summary */}
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">Total Portfolio</h3>
                            <div className="text-3xl font-bold text-emerald-400 mb-1">â‚¹ 12,45,000</div>
                            <p className="text-sm text-emerald-500/80">+12.5% this month</p>
                            <div className="mt-4 h-32 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500 text-sm">
                                [Chart: Value over Time]
                            </div>
                        </div>

                        {/* Market Snapshot */}
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">Market Snapshot</h3>
                            <ul className="space-y-3 mt-4">
                                <li className="flex justify-between text-sm">
                                    <span className="text-slate-300">NIFTY 50</span>
                                    <span className="text-emerald-400">+1.2%</span>
                                </li>
                                <li className="flex justify-between text-sm">
                                    <span className="text-slate-300">SENSEX</span>
                                    <span className="text-emerald-400">+0.8%</span>
                                </li>
                                <li className="flex justify-between text-sm">
                                    <span className="text-slate-300">BANK NIFTY</span>
                                    <span className="text-red-400">-0.3%</span>
                                </li>
                            </ul>
                        </div>

                        {/* Quick Insights */}
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                            <h3 className="text-xl font-bold text-white mb-2">Quick Insights</h3>
                            <div className="space-y-3">
                                <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg text-sm text-blue-200">
                                    ðŸ’¡ Heavy allocation in banking sector. Consider diversifying.
                                </div>
                                <div className="p-3 bg-purple-900/20 border border-purple-900/50 rounded-lg text-sm text-purple-200">
                                    ðŸš€ HDFC Bank is trading at a discount.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'portfolio':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Your Holdings</h2>
                                <p className="text-slate-400">Manage your investment portfolio.</p>
                            </div>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => setIsAddHoldingOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Holding
                            </Button>
                        </div>
                        <div className="mt-4 h-64 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500">
                            [Interactive Portfolio Table]
                        </div>
                    </div>
                );
            case 'watchlist':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">My Watchlist</h2>
                                <p className="text-slate-400">Track your favorite stocks and funds.</p>
                            </div>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => setIsAddWatchlistOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add to Watchlist
                            </Button>
                        </div>
                        <div className="mt-4 bg-slate-800/30 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">No items in watchlist yet.</p>
                        </div>
                    </div>
                );
            case 'market':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Market Analysis</h2>
                        <p className="text-slate-400">Live market data and charts.</p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-48 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500">[NIFTY Chart]</div>
                            <div className="h-48 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500">[Sector Performance]</div>
                        </div>
                    </div>
                );
            case 'insights':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">AI Recommendations</h2>
                        <p className="text-slate-400">Personalized investment strategies powered by Gemini.</p>
                    </div>
                );
            case 'transactions':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Transaction History</h2>
                        <p className="text-slate-400">View recent buy/sell orders and fund transfers.</p>
                    </div>
                );
            case 'reports':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Reports & Statements</h2>
                        <p className="text-slate-400">Download P&L reports, Tax statements, and Contract notes.</p>
                    </div>
                );
            case 'tax':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Tax Planning</h2>
                        <p className="text-slate-400">Analyze tax liabilities and optimize your portfolio.</p>
                        <div className="mt-4 bg-slate-800/30 p-4 rounded-lg">
                            <h4 className="text-emerald-400 font-medium mb-2">Projected Tax Liability</h4>
                            <p className="text-2xl font-bold text-white">â‚¹ 45,230</p>
                        </div>
                    </div>
                );
            case 'budget':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Budgeting & Goals</h2>
                        <p className="text-slate-400">Track updated expenses and set financial goals.</p>
                    </div>
                );
            case 'strategy':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Strategy Builder</h2>
                        <p className="text-slate-400">Create and customize automated trading strategies.</p>
                        <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                            + Create New Strategy
                        </Button>
                    </div>
                );
            case 'backtest':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Backtesting Engine</h2>
                        <p className="text-slate-400">Test your strategies against historical market data.</p>
                        <div className="mt-4 h-48 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500">
                            [Backtest Results Key Metrics]
                        </div>
                    </div>
                );
            case 'learn':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Learning Center</h2>
                        <p className="text-slate-400">Educational resources, tutorials, and market news.</p>
                    </div>
                );
            case 'support':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Help & Support</h2>
                        <p className="text-slate-400">Contact support, view FAQs, and raise tickets.</p>
                    </div>
                );
            case 'settings':
                return (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-in fade-in duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
                        <p className="text-slate-400">Profile management and preferences.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
            {/* Ticker Bar (Top) */}
            <Ticker userId={user?.email} />

            <div className="flex-1 flex overflow-hidden">
                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out flex flex-col top-10 md:top-0 h-[calc(100vh-40px)] md:h-auto
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
                `}>
                    <div className="p-6 border-b border-slate-800 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-2 rounded-lg">
                                <span className="text-white font-bold text-lg">IM</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                InvestMitra
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-wide">
                        <nav className="p-4 space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === item.id
                                        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex-shrink-0">
                        <div className="mb-4 px-4">
                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                                <Database className="h-3 w-3" /> Database Mode
                            </div>
                            <div className={`text-sm font-medium ${dbMode.includes("Mock") ? "text-amber-400" : "text-emerald-400"
                                }`}>
                                {dbMode}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">Status: {backendStatus}</div>
                        </div>
                        <Button
                            onClick={logout}
                            variant="ghost"
                            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                            <LogOut className="h-5 w-5" />
                            Sign Out
                        </Button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-40px)]">
                    {/* Mobile Header */}
                    <header className="md:hidden border-b border-slate-800 bg-slate-900/50 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-30">
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-1.5 rounded-md">
                                <span className="text-white font-bold text-sm">IM</span>
                            </div>
                            <span className="font-bold text-white">InvestMitra</span>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="h-6 w-6 text-slate-300" />
                        </button>
                    </header>

                    {/* Content */}
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
                        {/* Header for Desktop */}
                        <div className="hidden md:flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    {navItems.find(i => i.id === activeTab)?.label}
                                </h1>
                                <p className="text-slate-400">Welcome back, {user?.name || 'Investor'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Top right actions if needed */}
                            </div>
                        </div>

                        {renderContent()}

                        {/* Modals */}
                        <AddHoldingModal
                            isOpen={isAddHoldingOpen}
                            form={holdingForm}
                            setForm={setHoldingForm}
                            onClose={() => setIsAddHoldingOpen(false)}
                            onSave={handleSaveHolding}
                        />

                        <AddWatchlistModal
                            isOpen={isAddWatchlistOpen}
                            form={watchlistForm}
                            setForm={setWatchlistForm}
                            onClose={() => setIsAddWatchlistOpen(false)}
                            onSave={handleSaveWatchlist}
                        />

                    </main>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
