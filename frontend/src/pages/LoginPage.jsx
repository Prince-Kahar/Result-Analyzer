import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { LogIn, UserPlus, KeyRound, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

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

  // OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginUsername, loginPassword);
      await refreshSessions();
      // Flow enforcement: if no PDF uploaded, go to /upload, else /dashboard
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        college_name: regCollege
      });
      navigate('/upload');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(otpEmail);
      setOtpSent(true);
      setSuccessMsg('Reset OTP has been dispatched to your email address.');
    } catch (err) {
      setError(err.message || 'Failed to dispatch OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyOtp({ email: otpEmail, otp: otpCode, new_password: loginPassword });
      setSuccessMsg('Password updated successfully! Please login with your new credentials.');
      setTab('login');
      setOtpSent(false);
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <img src="/assets/logo.png" alt="SASCMA" className="w-12 h-12 mx-auto object-contain drop-shadow" />
          <h2 className="text-xl font-bold text-white">VNSGU Intelligence Portal</h2>
          <p className="text-xs text-slate-400">Authorized Academic Result Evaluation Suite</p>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-1 bg-slate-800/60 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-colors ${tab === 'login' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-colors ${tab === 'register' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Username / Email</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="sascma_admin or email"
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-300 font-semibold">Password</label>
                <button
                  type="button"
                  onClick={() => setTab('forgot')}
                  className="text-[11px] text-teal-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Username</label>
              <input
                type="text"
                required
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="professor_vnsgu"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Institutional Email</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@college.vnsgu.ac.in"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">College Name</label>
              <input
                type="text"
                required
                value={regCollege}
                onChange={(e) => setRegCollege(e.target.value)}
                placeholder="STERS College / VNSGU Department"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Complete Faculty Registration'}
            </button>
          </form>
        )}

        {/* Forgot Password Flow */}
        {tab === 'forgot' && (
          <div className="space-y-4 text-xs">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Registered Faculty Email</label>
                  <input
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="name@college.vnsgu.ac.in"
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  {loading ? 'Sending OTP...' : 'Send Password Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-center font-mono tracking-widest text-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="New secure password"
                    className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  {loading ? 'Verifying...' : 'Set New Password'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => { setTab('login'); setOtpSent(false); }}
              className="w-full text-center text-[11px] text-slate-400 hover:text-white"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
