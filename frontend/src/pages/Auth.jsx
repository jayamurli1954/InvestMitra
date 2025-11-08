import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import DisclaimerModal from '@/components/DisclaimerModal';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuickTestLogin = async () => {
    setLoading(true);
    try {
      await login('test@example.com', 'Test123!@#');
      toast.success('Quick login successful!');
    } catch (error) {
      console.error('Quick login error:', error);
      toast.error('Quick login failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // For registration, show disclaimer modal first
    if (!isLogin && !disclaimerAccepted) {
      setShowDisclaimerModal(true);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Logged in successfully!');
      } else {
        await register(formData.email, formData.password, formData.name, disclaimerAccepted);
        toast.success('Account created successfully!');
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMsg = error.response?.data?.detail || 'Authentication failed';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleDisclaimerAccept = async () => {
    setDisclaimerAccepted(true);
    setShowDisclaimerModal(false);

    // Now proceed with registration
    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.name, true);
      toast.success('Account created successfully!');
    } catch (error) {
      console.error('Auth error:', error);
      const errorMsg = error.response?.data?.detail || 'Registration failed';
      toast.error(errorMsg);
      setLoading(false);
    }
  };

  const handleDisclaimerDecline = () => {
    setShowDisclaimerModal(false);
    toast.info('You must accept the disclaimer to create an account');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">InvestPro</h1>
          <p className="text-slate-400 mt-2">Investment Framework</p>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-2 bg-slate-800 border-slate-700 text-white"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="mt-2 bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div style={{ position: 'relative' }}>
                <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="mt-2 bg-slate-800 border-slate-700 text-white"
                required
              />
              <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               style={{
                 position: 'absolute',
                 right: '10px',
                 top: '50%',
                 transform: 'translateY(-50%)',
                 background: 'none',
                 border: 'none',
                 cursor: 'pointer',
                 fontSize: '18px'
               }}
            >
               {showPassword ? '👁️' : '👁️‍🗨️'}
             </button>
            </div>
         <div style={{ marginTop: '10px', textAlign: 'right' }}>
           <button
             type="button"
             onClick={() => navigate('/forgot-password')}
             style={{
               background: 'none',
               border: 'none',
               color: '#3b82f6',
               cursor: 'pointer',
               fontSize: '14px',
               textDecoration: 'underline'
             }}
           >
             Forgot Password?
           </button>
          </div>
            </div>

            <div className="mt-4 text-center text-xs text-slate-500">
              <p>
                <b>⚠️ Disclaimer:</b> For educational purposes only. Not financial advice. Investments carry risk.{' '}
                <a
                  href="/disclaimer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-500 hover:text-emerald-400 underline"
                >
                  Read Full Disclaimer
                </a>
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <Button
              type="button"
              onClick={handleQuickTestLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
            >
              {loading ? 'Processing...' : 'Quick Test Login'}
            </Button>
          </div>

          <div className="mt-6 text-center text-slate-400 text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ email: '', password: '', name: '' });
              }}
              className="text-emerald-500 hover:text-emerald-400 font-medium"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal for Registration */}
      <DisclaimerModal
        open={showDisclaimerModal}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
      />
    </div>
  );
};

export default Auth;