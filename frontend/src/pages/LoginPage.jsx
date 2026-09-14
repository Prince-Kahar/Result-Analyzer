import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import {
  LogIn, UserPlus, KeyRound, Mail, CheckCircle2, AlertCircle,
  ShieldCheck, RefreshCw, Send, Check, X, Lock, User, Building, Phone
} from 'lucide-react';

export const LoginPage = () => {
  const { login, register } = useAuth();
  const { hasUploaded, refreshSessions } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCollege, setRegCollege] = useState('');

  // Register OTP state
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpLoading, setRegOtpLoading] = useState(false);
  const [regCountdown, setRegCountdown] = useState(0);

  // Forgot password OTP state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  // Timer countdown effect for OTP resend
  useEffect(() => {
    let timer;
    if (regCountdown > 0) {
      timer = setTimeout(() => setRegCountdown(regCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [regCountdown]);

  // Username validation rules
  const hasNoSpaces = !/\s/.test(regUsername);
  const isUsernameCharsValid = /^[a-zA-Z0-9_-]*$/.test(regUsername);
  const isUsernameValid = regUsername.length >= 3 && regUsername.length <= 30 && hasNoSpaces && /^[a-zA-Z0-9_-]+$/.test(regUsername);

  // Password validation rules
  const hasMinLen = regPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(regPassword);
  const hasLower = /[a-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;

  // Email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim());

  // Can request OTP
  const canRequestOtp = isUsernameValid && isEmailValid && isPasswordValid && regCollege.trim().length >= 2;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginUsername, loginPassword);
      await refreshSessions();
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (!hasUploaded) {
        navigate('/upload');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRegisterOtp = async () => {
    if (!canRequestOtp) {
      if (!isUsernameValid) return setError('Please enter a valid username (no spaces, only letters, numbers, hyphens, and underscores).');
      if (!isEmailValid) return setError('Please enter a valid institutional email address.');
      if (!isPasswordValid) return setError('Password must meet all 5 security requirements.');
      if (!regCollege.trim()) return setError('Please enter your college/department name.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setRegOtpLoading(true);

    try {
      const res = await api.sendOtp(regEmail.trim(), 'Faculty Registration');
      setRegOtpSent(true);
      setRegCountdown(60);
      setSuccessMsg(res.message || `Verification OTP has been sent to ${regEmail.trim()}. Please check your inbox.`);
      if (res.demoOtp) {
        console.log('Demo OTP (development/fallback):', res.demoOtp);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification code. Please check email address.');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!regOtpSent) {
      return setError('Please click "Generate OTP" to verify your email first.');
    }

    if (!regOtp || regOtp.trim().length !== 6) {
      return setError('Please enter the 6-digit verification code sent to your email.');
    }

    setLoading(true);
    try {
      await register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim(),
        college_name: regCollege.trim(),
        otp: regOtp.trim()
      });
      navigate('/upload');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.sendOtp(forgotEmail.trim(), 'Password Reset');
      setForgotOtpSent(true);
      setSuccessMsg(res.message || 'Reset code dispatched to your email.');
    } catch (err) {
      setError(err.message || 'Failed to dispatch OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyOtp(forgotEmail.trim(), forgotOtp.trim());
      await api.updatePassword({ new_password: forgotNewPassword });
      setSuccessMsg('Password reset successful! Please sign in with your new credentials.');
      setTab('login');
      setForgotOtpSent(false);
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <img src="/assets/logo.png" alt="SASCMA" className="w-12 h-12 mx-auto object-contain drop-shadow" />
          <h2 className="text-xl font-bold text-white tracking-tight">VNSGU Intelligence Portal</h2>
          <p className="text-xs text-slate-400">Authorized Academic Evaluation & Analytics Suite</p>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-1 bg-slate-800/60 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'login' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'register' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus size={14} />
            <span>Register</span>
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl leading-relaxed">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2.5 p-3 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl leading-relaxed">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================== LOGIN FORM ===================== */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Username / Institutional Email</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="sascma_admin or faculty@vnsgu.ac.in"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <User size={15} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Password</label>
                <button
                  type="button"
                  onClick={() => { setTab('forgot'); setError(''); setSuccessMsg(''); }}
                  className="text-[11px] text-teal-400 hover:text-teal-300 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            </button>
          </form>
        )}

        {/* ===================== REGISTRATION FORM WITH OTP ===================== */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            {/* Username Input with Validation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Username</label>
                <span className="text-[10px] text-slate-400">No spaces, only - and _</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="prof_sharma or vnsgu-evaluator"
                  className={`w-full pl-9 pr-8 py-2.5 bg-slate-800/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    regUsername.length === 0
                      ? 'border-slate-700 focus:border-teal-500'
                      : isUsernameValid
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : 'border-rose-500/70 focus:border-rose-400'
                  }`}
                />
                <User size={15} className="absolute left-3 top-3 text-slate-400" />
                {regUsername.length > 0 && (
                  <div className="absolute right-3 top-3">
                    {isUsernameValid ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <X size={14} className="text-rose-400" />
                    )}
                  </div>
                )}
              </div>
              {regUsername.length > 0 && !isUsernameValid && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <span>
                    {!hasNoSpaces
                      ? 'Spaces are not allowed in username.'
                      : !isUsernameCharsValid
                      ? 'Only letters, numbers, hyphens (-), and underscores (_) are allowed.'
                      : 'Must be between 3 and 30 characters.'}
                  </span>
                </p>
              )}
            </div>

            {/* Institutional Email */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Institutional Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="faculty@college.vnsgu.ac.in"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            {/* College Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">College / Department Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regCollege}
                  onChange={(e) => setRegCollege(e.target.value)}
                  placeholder="SASCMA College / Department of ICT, VNSGU"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <Building size={15} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            {/* Password with Comprehensive Checklist */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Create Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="e.g. Vnsgu@2026!"
                  className={`w-full pl-9 pr-8 py-2.5 bg-slate-800/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    regPassword.length === 0
                      ? 'border-slate-700 focus:border-teal-500'
                      : isPasswordValid
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : 'border-slate-700 focus:border-teal-500'
                  }`}
                />
                <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                {regPassword.length > 0 && (
                  <div className="absolute right-3 top-3">
                    {isPasswordValid ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Real-time Password Requirements Checklist */}
              {regPassword.length > 0 && (
                <div className="mt-2.5 p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    {hasMinLen ? <Check size={12} /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block" />}
                    <span>8+ Characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    {hasUpper ? <Check size={12} /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block" />}
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    {hasLower ? <Check size={12} /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block" />}
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    {hasNumber ? <Check size={12} /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block" />}
                    <span>Numeric (0-9)</span>
                  </div>
                  <div className={`col-span-2 flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                    {hasSpecial ? <Check size={12} /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block" />}
                    <span>Special Character (!@#$%^&*)</span>
                  </div>
                </div>
              )}
            </div>

            {/* OTP Section */}
            {!regOtpSent ? (
              <button
                type="button"
                onClick={handleSendRegisterOtp}
                disabled={regOtpLoading || !canRequestOtp}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {regOtpLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{regOtpLoading ? 'Sending Verification Code...' : 'Generate OTP for Verification'}</span>
              </button>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-teal-400" />
                      <span>Enter 6-Digit Email OTP</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSendRegisterOtp}
                      disabled={regCountdown > 0 || regOtpLoading}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-medium disabled:opacity-50 transition-colors"
                    >
                      {regCountdown > 0 ? `Resend in ${regCountdown}s` : 'Resend Code'}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={regOtp}
                    onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-slate-800/90 border border-teal-500/50 rounded-xl text-white text-center font-mono tracking-widest text-lg focus:outline-none focus:border-teal-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 text-center">
                    Check your email inbox or spam folder for the code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || regOtp.length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{loading ? 'Creating Verified Account...' : 'Verify OTP & Complete Registration'}</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* ===================== FORGOT PASSWORD FLOW ===================== */}
        {tab === 'forgot' && (
          <div className="space-y-4 text-xs">
            {!forgotOtpSent ? (
              <form onSubmit={handleForgotSendOtp} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Registered Faculty Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="faculty@college.vnsgu.ac.in"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{loading ? 'Sending Code...' : 'Send Password Reset Code'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-center font-mono tracking-widest text-lg focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="e.g. Vnsgu@2026!"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || forgotOtp.length !== 6 || forgotNewPassword.length < 8}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{loading ? 'Resetting Password...' : 'Verify OTP & Reset Password'}</span>
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); setForgotOtpSent(false); }}
                className="text-[11px] text-slate-400 hover:text-white font-medium transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
