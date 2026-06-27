import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';

const AuthContext = createContext(null);
const AUTH_TOKEN_STORAGE_KEY = 'investmitra_access_token';

const storeAccessToken = (token) => {
  if (!token) return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error('Failed to persist access token:', error);
  }
};

const clearAccessToken = () => {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear access token:', error);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Helper function to extract error message from various error formats
const getErrorMessage = (error) => {
  // If it's an axios error with response
  if (error.response?.data) {
    const data = error.response.data;
    
    // Handle FastAPI validation errors (array of error objects)
    if (Array.isArray(data)) {
      return data.map(e => e.msg || e.message || JSON.stringify(e)).join(', ');
    }
    
    // Handle single error object with 'detail' field
    if (data.detail) {
      return data.detail;
    }
    
    // Handle error object with 'message' field
    if (data.message) {
      return data.message;
    }
    
    // Handle error object with 'msg' field
    if (data.msg) {
      return data.msg;
    }
  }
  
  // Fallback to generic error message
  return error.message || 'An error occurred';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    // Don't check auth if we're processing a Google OAuth callback
    const hash = window.location.hash;
    if (!hash || !hash.includes('session_id=')) {
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      clearAccessToken();
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
      storeAccessToken(response.data.access_token);
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
      storeAccessToken(response.data.access_token);
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
      storeAccessToken(response.data.access_token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      // Verify the session was set properly
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
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
    clearAccessToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  // ============================================================================
  // PASSWORD RESET FUNCTIONS
  // ============================================================================

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
        reset_token: response.data.reset_token || null,
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

  // ============================================================================
  // END PASSWORD RESET FUNCTIONS
  // ============================================================================

  const value = {
    user,
    setUser, // Add this line
    loading,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    checkAuth,
    // Password reset functions
    forgotPassword,
    resetPassword,
    recoverEmail,
    verifyEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

