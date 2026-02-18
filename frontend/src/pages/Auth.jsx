import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import DisclaimerModal from '@/components/DisclaimerModal';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuickTestLogin = async () => {
    setLoading(true);
    try {
      await login('test@example.com', 'Test123!@#');
      toast.success('Quick login successful');
    } catch (error) {
      console.error('Quick login error:', error);
      toast.error('Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && !disclaimerAccepted) {
      setShowDisclaimerModal(true);
      toast.error('Please accept the Investment Disclaimer to continue');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Logged in successfully');
      } else {
        await register(formData.email, formData.password, formData.name, true);
        toast.success('Account created successfully');
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMsg = error.response?.data?.detail || 'Authentication failed';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisclaimerAccept = () => {
    setDisclaimerAccepted(true);
    setShowDisclaimerModal(false);
    toast.success('Disclaimer accepted. You can now create your account.');
  };

  const handleDisclaimerDecline = () => {
    setShowDisclaimerModal(false);
    setDisclaimerAccepted(false);
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
              <div className="relative mt-2">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-slate-800 border-slate-700 text-white pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-blue-400 underline hover:text-blue-300"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="rounded border border-slate-700 bg-slate-800/60 p-3">
                <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerAccepted}
                    onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I have read and accept the Investment Disclaimer.
                    <button
                      type="button"
                      onClick={() => setShowDisclaimerModal(true)}
                      className="ml-1 text-emerald-400 underline hover:text-emerald-300"
                    >
                      Read full disclaimer
                    </button>
                    <a
                      href="/#/disclaimer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-emerald-400 underline hover:text-emerald-300"
                    >
                      Open page
                    </a>
                  </span>
                </label>
              </div>
            )}

            <div className="text-center text-xs text-slate-500">
              For educational purposes only. Not financial advice. Investments carry risk.
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
                setShowPassword(false);
                setShowDisclaimerModal(false);
                setDisclaimerAccepted(false);
                setFormData({ email: '', password: '', name: '' });
              }}
              className="text-emerald-500 hover:text-emerald-400 font-medium"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>

      <DisclaimerModal
        open={showDisclaimerModal}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
      />
    </div>
  );
};

export default Auth;
