import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';

const AuthContext = createContext(null);

axios.defaults.withCredentials = true;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const getErrorMessage = (error) => {
  if (error.response?.data) {
    const data = error.response.data;

    if (Array.isArray(data)) {
      return data.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
    }

    if (data.detail) {
      return data.detail;
    }

    if (data.message) {
      return data.message;
    }

    if (data.msg) {
      return data.msg;
    }

    if (data.error) {
      return data.error;
    }
  }

  return error.message || 'An error occurred';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('session_token'));

  const saveToken = (token) => {
    if (token) {
      localStorage.setItem('session_token', token);
      setSessionToken(token);
    }
  };

  const clearToken = () => {
    localStorage.removeItem('session_token');
    setSessionToken(null);
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('session_id=')) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('session_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
        headers
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        `${API}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      if (response.data.access_token) {
        saveToken(response.data.access_token);
      }
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      const authError = new Error(message);
      authError.response = error.response;
      throw authError;
    }
  };

  const register = async (email, password, name, disclaimerAccepted = false) => {
    try {
      const response = await axios.post(
        `${API}/auth/register`,
        { email, password, name, disclaimer_accepted: disclaimerAccepted },
        { withCredentials: true }
      );
      if (response.data.access_token) {
        saveToken(response.data.access_token);
      }
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      const authError = new Error(message);
      authError.response = error.response;
      throw authError;
    }
  };

  const loginWithGoogle = () => {
    const redirectUrl = encodeURIComponent(window.location.origin + '/auth');
    window.location.href = `https://auth.emergentagent.com/?redirect=${redirectUrl}`;
  };

  const handleGoogleCallback = async (sessionId) => {
    try {
      const response = await axios.post(
        `${API}/auth/google?session_id=${sessionId}`,
        {},
        { withCredentials: true }
      );
      if (response.data.access_token) {
        saveToken(response.data.access_token);
      }
      setUser(response.data.user);
      setIsAuthenticated(true);

      await new Promise(resolve => setTimeout(resolve, 100));
      await checkAuth();

      return response.data;
    } catch (error) {
      console.error('Google callback error:', error);
      const message = getErrorMessage(error);
      const authError = new Error(message);
      authError.response = error.response;
      throw authError;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('session_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true, headers });
    } catch (error) {
      console.error('Logout error:', error);
    }
    clearToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  const forgotPassword = async (email) => {
    try {
      const response = await axios.post(
        `${API}/auth/forgot-password`,
        { email },
        { withCredentials: true }
      );
      return {
        success: true,
        message: response.data.message || 'Password reset email has been sent',
        delivery: response.data.delivery || 'requested'
      };
    } catch (error) {
      const message = getErrorMessage(error);
      return {
        success: false,
        message: message
      };
    }
  };

  const resetPassword = async (token, newPassword, confirmPassword) => {
    try {
      const response = await axios.post(
        `${API}/auth/reset-password`,
        {
          token,
          new_password: newPassword,
          confirm_password: confirmPassword
        },
        { withCredentials: true }
      );
      return {
        success: true,
        message: response.data.message || 'Password has been reset successfully'
      };
    } catch (error) {
      const message = getErrorMessage(error);
      return {
        success: false,
        message: message
      };
    }
  };

  const recoverEmail = async (fullName) => {
    try {
      const response = await axios.post(
        `${API}/auth/recover-email`,
        { full_name: fullName },
        { withCredentials: true }
      );
      return {
        success: true,
        masked_email: response.data.masked_email,
        message: response.data.message || 'Email recovered'
      };
    } catch (error) {
      const message = getErrorMessage(error);
      return {
        success: false,
        message: message
      };
    }
  };

  const verifyEmail = async (token) => {
    try {
      const response = await axios.post(
        `${API}/auth/verify-email`,
        { token },
        { withCredentials: true }
      );
      return {
        success: true,
        message: response.data.message || 'Email verified successfully'
      };
    } catch (error) {
      const message = getErrorMessage(error);
      return {
        success: false,
        message: message
      };
    }
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    sessionToken,
    login,
    register,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    checkAuth,
    forgotPassword,
    resetPassword,
    recoverEmail,
    verifyEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
