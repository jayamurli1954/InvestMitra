import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { forgotPassword, resetPassword, recoverEmail } = useAuth();
  
  const [step, setStep] = useState(1); // 1: email, 2: token, 3: password
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);

  // CHECK URL FOR TOKEN ON LOAD
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setStep(2); // Go directly to password reset step
      setSuccess('✅ Token found! Now enter your new password.');
    }
  }, [searchParams]);

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#1e293b',
    borderRadius: '0.5rem',
    border: '1px solid #334155',
    padding: '2rem'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem'
  };

  const titleStyle = {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '0.5rem'
  };

  const subtitleStyle = {
    color: '#94a3b8',
    fontSize: '0.875rem'
  };

  const errorStyle = {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
    fontSize: '0.875rem'
  };

  const successStyle = {
    backgroundColor: '#15803d',
    color: '#86efac',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
    fontSize: '0.875rem'
  };

  const formGroupStyle = {
    marginBottom: '1rem'
  };

  const labelStyle = {
    display: 'block',
    color: '#cbd5e1',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
    fontWeight: '500'
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#334155',
    borderColor: '#475569',
    border: '1px solid #475569',
    color: 'white',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    fontFamily: 'inherit',
    fontSize: '1rem',
    boxSizing: 'border-box'
  };

  const passwordInputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  };

  const passwordToggleStyle = {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '0'
  };

  const buttonStyle = {
    width: '100%',
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    marginTop: '1rem',
    fontSize: '1rem'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6b7280',
    marginTop: '0.5rem'
  };

  const smallTextStyle = {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.25rem'
  };

  const linkButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textDecoration: 'underline'
  };

  const successScreenStyle = {
    textAlign: 'center',
    padding: '2rem 0'
  };

  const successIconStyle = {
    fontSize: '4rem',
    marginBottom: '1rem',
    animation: 'pulse 0.5s'
  };

  const prominentSuccessStyle = {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    textAlign: 'center',
    border: '2px solid #059669'
  };

  const recoveryFormStyle = {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #475569'
  };

  const maskedEmailResultStyle = {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#1f2937',
    borderRadius: '0.375rem',
    textAlign: 'center',
    color: '#10b981'
  };

  // Step 1: User enters email and requests reset (supports email + dev token fallback)
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate email
    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const result = await forgotPassword(email);
      if (!result.success) {
        setError(result.message || 'Failed to start password reset.');
        return;
      }
      if (result.delivery === 'dev_token' && result.reset_token) {
        setResetToken(result.reset_token);
        setSuccess('Reset token generated (dev mode). Token pre-filled. Set your new password now.');
        setStep(2);
        return;
      }
      if (result.delivery === 'email_unavailable') {
        setError(result.message || 'Email service is unavailable. Please contact support/admin.');
        return;
      }
      if (result.success) {
        // Success - show confirmation message
        setSuccess('✅ Password reset email has been sent! Check your inbox (and spam folder). Click the link in the email to reset your password.');
        setStep(2);
      } else {
        // Not found or error - show friendly message (don't reveal if email exists - security)
        setSuccess('✅ If an account with this email exists, you will receive a password reset link. Please check your email inbox and spam folder.');
        // Still advance to next step to show email was processed
        setStep(2);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An error occurred. Please try again or use "Can\'t Remember Your Email?" to find your account.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User enters token and new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate input
    if (!resetToken.trim()) {
      setError('Please enter the token from your email');
      setLoading(false);
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const result = await resetPassword(resetToken, newPassword, confirmPassword);
      if (result.success) {
        // Show success immediately
        setSuccess('✅ Password reset successfully! Redirecting to login...');
        setStep(3);
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        setError(result.message || 'Failed to reset password. Please verify your token and try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An error occurred: ' + (err.message || 'Please try again.'));
      setLoading(false);
    }
  };

  // Email recovery: User enters name to find account
  const handleRecoverEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await recoverEmail(fullName);
      if (result.success) {
        setMaskedEmail(result.masked_email);
        setSuccess(`✅ Account found! Your email is: ${result.masked_email}`);
        setFullName(''); // Clear form
      } else {
        setError(result.message || 'Account not found. Please check the name and try again.');
      }
    } catch (err) {
      console.error('Email recovery error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>Reset Your Password</h2>
          <p style={subtitleStyle}>Regain access to your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={errorStyle}>
            <span>❌ {error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={successStyle}>
            <span>{success}</span>
          </div>
        )}

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleForgotPassword}>
            <div style={formGroupStyle}>
              <label htmlFor="email" style={labelStyle}>Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
                style={inputStyle}
              />
              <div style={smallTextStyle}>We'll send a password reset link to this email</div>
            </div>

            <button 
              type="submit" 
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* Step 2: Enter Token and New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div style={formGroupStyle}>
              <label htmlFor="token" style={labelStyle}>Reset Token</label>
              <input
                type="text"
                id="token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste the token from your email"
                required
                disabled={loading}
                style={inputStyle}
              />
              <div style={smallTextStyle}>Check your email for the reset token (it's in the password reset link or copy it from the URL)</div>
            </div>

            <div style={formGroupStyle}>
              <label htmlFor="newPassword" style={labelStyle}>New Password</label>
              <div style={passwordInputWrapperStyle}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  style={{...inputStyle, paddingRight: '40px'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={passwordToggleStyle}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <div style={smallTextStyle}>At least 8 characters, with uppercase, lowercase, and numbers</div>
            </div>

            <div style={formGroupStyle}>
              <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
              <div style={passwordInputWrapperStyle}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                  style={{...inputStyle, paddingRight: '40px'}}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={passwordToggleStyle}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              style={buttonStyle}
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                setStep(1);
                setError('');
                setSuccess('');
                setEmail('');
                setResetToken('');
              }}
              disabled={loading}
            >
              Back to Email
            </button>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div style={successScreenStyle}>
            <div style={prominentSuccessStyle}>
              ✅ PASSWORD RESET SUCCESSFULLY!
            </div>
            <div style={successIconStyle}>✅</div>
            <h3 style={{color: '#10b981', fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 'bold'}}>Password Changed!</h3>
            <p style={{color: '#cbd5e1', marginBottom: '1.5rem', fontSize: '1rem'}}>Your password has been successfully reset.</p>
            <p style={{color: '#94a3b8', marginBottom: '2rem', fontSize: '0.9rem'}}>You will be redirected to login in a few seconds...</p>
            <button 
              style={buttonStyle}
              onClick={() => navigate('/auth')}
            >
              Go to Login Now →
            </button>
          </div>
        )}

        {/* Email Recovery Section */}
        <div style={recoveryFormStyle}>
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => setShowRecoveryForm(!showRecoveryForm)}
          >
            {showRecoveryForm ? '✕ Close' : '🔍 Can\'t Remember Your Email?'}
          </button>

          {showRecoveryForm && (
            <form onSubmit={handleRecoverEmail} style={{marginTop: '1rem'}}>
              <div style={formGroupStyle}>
                <label htmlFor="fullName" style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                  style={inputStyle}
                />
                <div style={smallTextStyle}>Enter the name you used when creating your account</div>
              </div>

              <button 
                type="submit" 
                style={secondaryButtonStyle}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Find My Email'}
              </button>

              {maskedEmail && (
                <div style={maskedEmailResultStyle}>
                  <p>📧 Your email: <strong>{maskedEmail}</strong></p>
                  <p style={{fontSize: '0.875rem', marginTop: '0.5rem'}}>Now you can use "Send Reset Link" above with this email</p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Back to Login Link */}
        <div style={{marginTop: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem'}}>
          <p>
            Remember your password?{' '}
            <button
              type="button"
              style={linkButtonStyle}
              onClick={() => navigate('/auth')}
            >
              Back to Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
