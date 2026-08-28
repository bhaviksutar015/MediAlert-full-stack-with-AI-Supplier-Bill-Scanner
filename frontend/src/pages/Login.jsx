import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config/api';

const Login = () => {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLoginOrRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login' ? { email, password } : { name, email, password };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
        })
      );
      showSuccess(authMode === 'login' ? 'Welcome back! Signed in successfully.' : 'Account created successfully.');
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      setError(errMsg);
      showError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match';
      setError(msg);
      showError(msg);
      return;
    }

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setError(msg);
      showError(msg);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
        email,
        newPassword: password,
      });

      const message = response.data.message || 'Password reset successfully!';
      setSuccessMsg(message);
      showSuccess(message);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setAuthMode('login');
      }, 1800);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to reset password. Please verify your email.';
      setError(errMsg);
      showError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="login-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="brand-logo-wrap" style={{ width: '42px', height: '42px' }}>
              {authMode === 'forgot' ? <KeyRound size={22} /> : <Activity size={24} />}
            </div>
          </div>
          <h2>MediaAlert</h2>
          <p>
            {authMode === 'login' && 'Sign in to access pharmacy inventory'}
            {authMode === 'register' && 'Register a new chemist account'}
            {authMode === 'forgot' && 'Reset your account password'}
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}
        {successMsg && <div className="login-success">{successMsg}</div>}

        {/* FORGOT PASSWORD FORM */}
        {authMode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="login-form">
            <div className="form-group">
              <label>Registered Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  minLength={6}
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary login-btn">
              {isLoading ? 'Updating Password...' : 'Reset Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="text-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* LOGIN & REGISTER FORM */
          <form onSubmit={handleLoginOrRegister} className="login-form">
            {authMode === 'register' && (
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chemist@example.com"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {authMode === 'login' && (
              <div className="auth-options">
                <label className="remember-me">
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <button
                  type="button"
                  onClick={() => handleModeChange('forgot')}
                  className="text-link text-xs"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary login-btn">
              {isLoading ? 'Authenticating...' : (authMode === 'login' ? 'Sign In to Dashboard' : 'Create Chemist Account')}
            </button>
          </form>
        )}

        {authMode !== 'forgot' && (
          <div className="auth-footer">
            <p>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => handleModeChange(authMode === 'login' ? 'register' : 'login')}
                className="text-link bold"
              >
                {authMode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;