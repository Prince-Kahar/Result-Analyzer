import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldAlert, ShieldCheck, Users, FileSpreadsheet, Lock, KeyRound,
  Trash2, RefreshCw, CheckCircle2, AlertTriangle, Mail, Send,
  Building, Phone, Search, UserCheck, UserX, Cpu, Database
} from 'lucide-react';

export const AdminPage = () => {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'admin' || user.username === 'sascma_admin');

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'sessions' | 'security'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Reset Password Modal State
  const [resetModal, setResetModal] = useState({ open: false, user: null, password: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // SMTP Test State
  const [smtpEmail, setSmtpEmail] = useState(user?.email || 'prince.kahar.king@gmail.com');
  const [smtpLoading, setSmtpLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, sessionsRes] = await Promise.all([
        api.getAdminStats().catch(() => ({ stats: null })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAdminSessions().catch(() => ({ sessions: [] })),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (usersRes?.users) setUsersList(usersRes.users);
      if (sessionsRes?.sessions) setSessionsList(sessionsRes.sessions);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to load admin telemetry' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change ${targetUser.username}'s role to ${newRole}?`)) return;

    setActionLoading(true);
    try {
      await api.updateUserRole(targetUser.id, newRole);
      setMsg({ type: 'success', text: `Updated ${targetUser.username} to ${newRole}.` });
      fetchAdminData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to update role' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.username === 'sascma_admin') {
      return alert('Cannot delete the primary system administrator.');
    }
    if (!window.confirm(`PERMANENT ACTION: Delete user "${targetUser.username}" and all related data?`)) return;

    setActionLoading(true);
    try {
      await api.deleteAdminUser(targetUser.id);
      setMsg({ type: 'success', text: `User ${targetUser.username} permanently deleted.` });
      fetchAdminData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete user' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModal.password || resetModal.password.length < 8) {
      return alert('Password must be at least 8 characters.');
    }

    setActionLoading(true);
    try {
      await api.adminResetPassword(resetModal.user.id, resetModal.password);
      setMsg({ type: 'success', text: `Password for ${resetModal.user.username} has been reset and Bcrypt encrypted.` });
      setResetModal({ open: false, user: null, password: '' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Password reset failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSession = async (session) => {
    if (!window.confirm(`Delete examination session "${session.session_name}"? This removes student marks parsed in this session.`)) return;

    setActionLoading(true);
    try {
      await api.deleteAdminSession(session.id);
      setMsg({ type: 'success', text: `Session ${session.session_name} removed.` });
      fetchAdminData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete session' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api.testAdminSmtp(smtpEmail.trim());
      setMsg({ type: 'success', text: res.message || 'Diagnostic email sent successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'SMTP diagnostic failed' });
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleRehashPasswords = async () => {
    if (!window.confirm('Run security migration to convert any legacy plaintext passwords to salted Bcrypt hashes?')) return;
    setActionLoading(true);
    try {
      const res = await api.rehashLegacyPasswords();
      setMsg({ type: 'success', text: res.message || 'Security migration completed!' });
      fetchAdminData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Migration failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Access Denied</h2>
          <p className="text-xs text-slate-400 mb-6">
            Administrator privileges are required to access this console. Please log in with an administrator account.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all"
          >
            Return to Executive Dashboard
          </a>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u =>
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.college_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-teal-500/20 to-teal-700/20 border border-teal-500/40 rounded-2xl text-teal-400 shadow-inner">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Admin Operations Console</h1>
                <span className="px-2.5 py-0.5 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Superadmin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Veer Narmad South Gujarat University Examination System Management & Security Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRehashPasswords}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Ensure all stored passwords use salted Bcrypt hashing"
            >
              <Lock size={13} className="text-teal-400" />
              <span>Verify Bcrypt Encryption</span>
            </button>

            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all"
              title="Refresh telemetry data"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-teal-400' : ''} />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {msg.text && (
          <div className={`mt-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
            msg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {msg.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span className="flex-1">{msg.text}</span>
            <button onClick={() => setMsg({ type: '', text: '' })} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}
      </div>

      {/* 4 Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Registered Faculty & Users</span>
            <Users size={18} className="text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalUsers ?? '...'}</div>
          <p className="text-[11px] text-teal-400 mt-1 font-medium">
            {stats?.adminCount || 1} System Administrator(s)
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Exam Sessions</span>
            <FileSpreadsheet size={18} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalSessions ?? '...'}</div>
          <p className="text-[11px] text-slate-400 mt-1">Uploaded and indexed PDF sessions</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Processed Students</span>
            <Cpu size={18} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats?.totalStudents?.toLocaleString() ?? '...'}</div>
          <p className="text-[11px] text-slate-400 mt-1">Evaluated across all sessions</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Security Architecture</span>
            <ShieldCheck size={18} className="text-emerald-400" />
          </div>
          <div className="text-sm font-black text-emerald-400">Bcrypt + Anti-SQLi</div>
          <p className="text-[10px] text-slate-400 mt-1">
            Zero plaintext • Salt 10 • PostgREST Sanitize
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users size={14} />
          <span>Faculty & User Management ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'sessions'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>Exam Sessions ({sessionsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Lock size={14} />
          <span>Security Diagnostics & Mail</span>
        </button>
      </div>

      {/* ===================== TAB 1: USERS MANAGEMENT ===================== */}
      {activeTab === 'users' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search faculty by username, email or college..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            </div>

            <div className="text-[11px] text-slate-400">
              Showing {filteredUsers.length} of {usersList.length} accounts
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">College / Dept</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No matching user accounts located.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs uppercase">
                            {u.username?.charAt(0) || 'U'}
                          </span>
                          <div>
                            <div>{u.username}</div>
                            {u.username === 'sascma_admin' && (
                              <span className="text-[9px] text-amber-400 uppercase font-black tracking-widest">Master Admin</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Mail size={12} className="text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Phone size={11} />
                            <span>+91 {u.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building size={12} className="text-slate-500 shrink-0" />
                          <span className="truncate max-w-[200px]" title={u.college_name || 'VNSGU Affiliated'}>
                            {u.college_name || 'VNSGU Affiliated'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {u.username !== 'sascma_admin' && (
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={actionLoading}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                              title={u.role === 'admin' ? 'Demote to Faculty' : 'Promote to Admin'}
                            >
                              {u.role === 'admin' ? <UserX size={13} className="text-amber-400" /> : <UserCheck size={13} className="text-teal-400" />}
                            </button>
                          )}

                          <button
                            onClick={() => setResetModal({ open: true, user: u, password: '' })}
                            disabled={actionLoading}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            title="Reset password with Bcrypt encryption"
                          >
                            <KeyRound size={13} className="text-blue-400" />
                          </button>

                          {u.username !== 'sascma_admin' && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={actionLoading}
                              className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: SESSIONS MANAGEMENT ===================== */}
      {activeTab === 'sessions' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Indexed Examination Result Sessions</h3>
            <span className="text-[11px] text-slate-400">Total sessions: {sessionsList.length}</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Session Name / Gazette</th>
                  <th className="py-3 px-4">Course Name</th>
                  <th className="py-3 px-4">Total Students</th>
                  <th className="py-3 px-4">Upload Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {sessionsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No examination sessions found in database.
                    </td>
                  </tr>
                ) : (
                  sessionsList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet size={16} className="text-teal-400 shrink-0" />
                          <span>{s.session_name || 'Gazette Result Session'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{s.course_name || 'B.Com / VNSGU'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-400">
                        {Number(s.total_students || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {s.created_at ? new Date(s.created_at).toLocaleString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSession(s)}
                          disabled={actionLoading}
                          className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px]"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: SECURITY DIAGNOSTICS & MAIL ===================== */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security Architecture Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cryptographic Password Protection</h3>
                <p className="text-[11px] text-slate-400">Bcrypt Hashing (10 Salt Rounds) & Anti-SQLi Shield</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span>Bcrypt Password Encryption</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Active (10 Rounds)
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span>SQL / PostgREST Injection Sanitizer</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> Active
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span>Legacy Plaintext Passwords</span>
                <span className="text-teal-400 font-bold">Auto-Upgraded on Login</span>
              </div>
            </div>

            <button
              onClick={handleRehashPasswords}
              disabled={actionLoading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Lock size={14} />
              <span>Run One-Click Bcrypt Password Upgrade</span>
            </button>
          </div>

          {/* Mail Server Diagnostics Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-xl">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">SMTP Email Gateway Diagnostics</h3>
                <p className="text-[11px] text-slate-400">Automated OTP & Welcome Mail Pipeline</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Test automated delivery of verification emails via Gmail SMTP server (<code className="text-teal-400">prince.kahar.king@gmail.com</code>).
            </p>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-300 font-semibold">Recipient Email for Test</label>
              <div className="relative">
                <input
                  type="email"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <button
              onClick={handleTestSmtp}
              disabled={smtpLoading || !smtpEmail.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {smtpLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{smtpLoading ? 'Sending Diagnostic Email...' : 'Send Test Diagnostic Email'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================== RESET PASSWORD MODAL ===================== */}
      {resetModal.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-teal-400">
              <KeyRound size={24} />
              <h3 className="text-sm font-black text-white">Reset User Password</h3>
            </div>
            <p className="text-xs text-slate-400">
              Set a new secure password for <strong className="text-white">{resetModal.user?.username}</strong>. It will be immediately hashed using salted Bcrypt.
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  required
                  value={resetModal.password}
                  onChange={(e) => setResetModal({ ...resetModal, password: e.target.value })}
                  placeholder="Enter min. 8 characters"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModal({ open: false, user: null, password: '' })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-teal-500/20"
                >
                  {actionLoading ? 'Saving...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
