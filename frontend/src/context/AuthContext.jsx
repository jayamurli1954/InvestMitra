import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(
      `${API}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response.data;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(
      `${API}/auth/register`,
      { email, password, name },
      { withCredentials: true }
    );
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response.data;
  };

  const loginWithGoogle = () => {
    const redirectUrl = encodeURIComponent(window.location.origin + '/dashboard');
    window.location.href = `https://auth.emergentagent.com/?redirect=${redirectUrl}`;
  };

  const handleGoogleCallback = async (sessionId) => {
    const response = await axios.post(
      `${API}/auth/google?session_id=${sessionId}`,
      {},
      { withCredentials: true }
    );
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};