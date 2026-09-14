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

  // Real-time Username Check State
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null | true | false
  const [usernameMsg, setUsernameMsg] = useState('');

  // Real-time Email Check State
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null); // null | true | false
  const [emailMsg, setEmailMsg] = useState('');

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
  const isUsernameFormatValid = regUsername.length >= 3 && regUsername.length <= 30 && hasNoSpaces && /^[a-zA-Z0-9_-]+$/.test(regUsername);

  // Real-time Username Check against Database (Debounced 350ms)
  useEffect(() => {
    if (!regUsername || regUsername.trim().length < 3 || !hasNoSpaces || !isUsernameCharsValid) {
      setUsernameCheckLoading(false);
      setUsernameAvailable(null);
      setUsernameMsg('');
      return;
    }

    setUsernameCheckLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkUsername(regUsername.trim());
        if (res.available) {
          setUsernameAvailable(true);
          setUsernameMsg('Username is unique & available');
        } else {
          setUsernameAvailable(false);
          setUsernameMsg(res.message || 'Username is already taken in database.');
        }
      } catch (err) {
        console.warn('Username check error:', err);
        setUsernameAvailable(null);
        setUsernameMsg('');
      } finally {
        setUsernameCheckLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [regUsername, hasNoSpaces, isUsernameCharsValid]);

  // Email validation rules
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim());

  // Real-time Email Check against Database (Debounced 400ms)
  useEffect(() => {
    if (!isEmailValid) {
      setEmailCheckLoading(false);
      setEmailAvailable(null);
      setEmailMsg('');
      return;
    }

    setEmailCheckLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkEmail(regEmail.trim());
        if (res.available) {
          setEmailAvailable(true);
          setEmailMsg('Email is available for registration');
        } else {
          setEmailAvailable(false);
          setEmailMsg('This email is already registered in our database. Please log in.');
        }
      } catch (err) {
        console.warn('Email check error:', err);
        setEmailAvailable(null);
        setEmailMsg('');
      } finally {
        setEmailCheckLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [regEmail, isEmailValid]);

  // Password validation rules
  const hasMinLen = regPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(regPassword);
  const hasLower = /[a-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regPassword);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial;

  // Can request OTP: Valid format, database confirms unique, password valid, college filled
  const canRequestOtp = isUsernameFormatValid &&
    usernameAvailable === true &&
    !usernameCheckLoading &&
    isEmailValid &&
    emailAvailable === true &&
    !emailCheckLoading &&
    isPasswordValid &&
    regCollege.trim().length >= 2;

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
    if (usernameAvailable === false) {
      return setError(`Username "${regUsername.trim()}" is already taken in our database. Please choose a different username.`);
    }
    if (emailAvailable === false) {
      return setError('This email is already registered in our database. Please sign in or use Forgot Password.');
    }
    if (!canRequestOtp) {
      if (!isUsernameFormatValid) return setError('Please enter a valid username (no spaces, only letters, numbers, hyphens, and underscores).');
      if (usernameAvailable !== true) return setError('Please wait for username availability check.');
      if (!isEmailValid) return setError('Please enter a valid institutional email address.');
      if (emailAvailable !== true) return setError('Please wait for email check.');
      if (!isPasswordValid) return setError('Password must meet all 5 security requirements.');
      if (!regCollege.trim()) return setError('Please enter your college/department name.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setRegOtpLoading(true);

    try {
      const res = await api.sendOtp(regEmail.trim(), 'Faculty Registration', regUsername.trim());
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

    if (usernameAvailable === false) {
      return setError('Username is already taken in our database. Please choose another username.');
    }

    if (emailAvailable === false) {
      return setError('This email is already registered in our database. Please log in.');
    }

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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 my-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-teal-500/10 rounded-2xl border border-teal-500/20 text-teal-400 mb-3 shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            VNSGU Portal Access
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            South Gujarat University Result & Analytics Engine
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus size={13} />
            <span>Register</span>
          </button>

          <button
            onClick={() => { setTab('forgot'); setError(''); setSuccessMsg(''); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'forgot'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound size={13} />
            <span>Reset</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-400 animate-shake">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-400">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ===================== SIGN IN FORM ===================== */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Username or Email</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter username or institutional email"
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
                  onClick={() => setTab('forgot')}
                  className="text-teal-400 hover:underline text-[11px]"
                >
                  Forgot password?
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

        {/* ===================== REGISTRATION FORM WITH OTP & REAL-TIME CHECKS ===================== */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            {/* Username Input with Real-time DB Uniqueness Check */}
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
                      : !isUsernameFormatValid || usernameAvailable === false
                      ? 'border-rose-500/70 focus:border-rose-400'
                      : usernameAvailable === true
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : 'border-slate-700 focus:border-teal-500'
                  }`}
                />
                <User size={15} className="absolute left-3 top-3 text-slate-400" />
                {regUsername.length > 0 && (
                  <div className="absolute right-3 top-3">
                    {usernameCheckLoading ? (
                      <RefreshCw size={14} className="animate-spin text-teal-400" />
                    ) : usernameAvailable === true ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : !isUsernameFormatValid || usernameAvailable === false ? (
                      <X size={14} className="text-rose-400" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Dynamic Username Status Badge */}
              {regUsername.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {!hasNoSpaces ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} /> Spaces are not allowed in username.
                    </span>
                  ) : !isUsernameCharsValid ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle size={12} /> Only letters, numbers, hyphens (-), and underscores (_) are allowed.
                    </span>
                  ) : regUsername.length < 3 ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle size={12} /> Must be at least 3 characters.
                    </span>
                  ) : usernameCheckLoading ? (
                    <span className="text-teal-400 flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin" /> Checking username in database...
                    </span>
                  ) : usernameAvailable === true ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} /> Username is unique & available!
                    </span>
                  ) : usernameAvailable === false ? (
                    <span className="text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {usernameMsg || 'Username is already taken in database.'}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Institutional Email with Real-time DB Pre-check */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Institutional Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="faculty@college.vnsgu.ac.in"
                  className={`w-full pl-9 pr-8 py-2.5 bg-slate-800/80 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors ${
                    regEmail.length === 0
                      ? 'border-slate-700 focus:border-teal-500'
                      : emailAvailable === false
                      ? 'border-rose-500/70 focus:border-rose-400'
                      : emailAvailable === true
                      ? 'border-emerald-500/60 focus:border-emerald-400'
                      : 'border-slate-700 focus:border-teal-500'
                  }`}
                />
                <Mail size={15} className="absolute left-3 top-3 text-slate-400" />
                {regEmail.length > 0 && isEmailValid && (
                  <div className="absolute right-3 top-3">
                    {emailCheckLoading ? (
                      <RefreshCw size={14} className="animate-spin text-teal-400" />
                    ) : emailAvailable === true ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : emailAvailable === false ? (
                      <X size={14} className="text-rose-400" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Dynamic Email Status Badge */}
              {regEmail.length > 0 && isEmailValid && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {emailCheckLoading ? (
                    <span className="text-teal-400 flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin" /> Checking email in database...
                    </span>
                  ) : emailAvailable === true ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} /> Email is available for new registration
                    </span>
                  ) : emailAvailable === false ? (
                    <span className="text-rose-400 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} /> {emailMsg || 'This email is already registered in our database. Please log in.'}
                    </span>
                  ) : null}
                </div>
              )}
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
                <span>{regOtpLoading ? 'Verifying & Sending OTP...' : 'Generate OTP for Verification'}</span>
              </button>
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-teal-300">Enter Verification Code</span>
                    <button
                      type="button"
                      disabled={regCountdown > 0 || regOtpLoading}
                      onClick={handleSendRegisterOtp}
                      className="text-[11px] text-teal-400 hover:underline disabled:text-slate-500 disabled:no-underline"
                    >
                      {regCountdown > 0 ? `Resend in ${regCountdown}s` : 'Resend Code'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={regOtp}
                    onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-teal-500/40 rounded-xl text-white text-center font-mono text-base tracking-widest focus:outline-none focus:border-teal-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    A 6-digit automated verification code was sent to <strong className="text-slate-200">{regEmail}</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || regOtp.length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{loading ? 'Creating Account...' : 'Verify OTP & Complete Registration'}</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* ===================== FORGOT PASSWORD FORM ===================== */}
        {tab === 'forgot' && (
          <div className="space-y-4 text-xs">
            {!forgotOtpSent ? (
              <form onSubmit={handleForgotSendOtp} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Registered Email Address</label>
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
                  <p className="text-[10px] text-slate-400 mt-1">
                    We will send a 6-digit verification code to reset your account password.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{loading ? 'Sending Code...' : 'Send Reset Code'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Enter Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-teal-500/40 rounded-xl text-white text-center font-mono text-sm tracking-widest focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Create New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Min. 8 characters with upper, lower, num & special"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <Lock size={15} className="absolute left-3 top-3 text-slate-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>{loading ? 'Updating...' : 'Verify & Set New Password'}</span>
                </button>
              </form>
            )}
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="text-center text-[11px] text-slate-400 z-10">
        <p>© 2026 Veer Narmad South Gujarat University • Examination Automation Cell</p>
      </div>
    </div>
  );
};
