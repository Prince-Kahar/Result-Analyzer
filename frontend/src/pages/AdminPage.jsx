import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ShieldAlert, ShieldCheck, Users, FileSpreadsheet, Lock, KeyRound,
  Trash2, RefreshCw, CheckCircle2, AlertTriangle, Mail, Send,
  Building, Phone, Search, UserCheck, UserX, Cpu, Database,
  PlusCircle, Edit3, ArrowLeft, ExternalLink, MessageSquare,
  GraduationCap, Download, Radio, Volume2, Save, X, Eye, EyeOff,
  Server, Activity, Shield, Layers, HardDrive, Terminal, Clock,
  ToggleLeft, ToggleRight, Check, Copy
} from 'lucide-react';

export const AdminPage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Active Admin View Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'sessions' | 'students' | 'explorer' | 'tickets' | 'broadcast'

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcement, setAnnouncement] = useState({ active: false, message: '', type: 'info', maintenanceMode: false });

  // Table Explorer state
  const [selectedTable, setSelectedTable] = useState('profiles');
  const [tableData, setTableData] = useState({ columns: [], rows: [], count: 0 });
  const [tableLoading, setTableLoading] = useState(false);

  // Student details modal state
  const [selectedStudentMarks, setSelectedStudentMarks] = useState([]);
  const [showStudentMarksModal, setShowStudentMarksModal] = useState(false);
  const [marksLoading, setMarksLoading] = useState(false);

  // General loading & notification states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Student search state
  const [studentSearchQ, setStudentSearchQ] = useState('');
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  // Modals state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [showRenameSessionModal, setShowRenameSessionModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [showReplyTicketModal, setShowReplyTicketModal] = useState(false);

  // Selected items for modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Form inputs
  const [newUserForm, setNewUserForm] = useState({
    username: '', email: '', phone: '', college_name: '', course: 'All Courses', password: '', role: 'faculty'
  });
  const [editUserForm, setEditUserForm] = useState({
    college_name: '', phone: '', course: '', email: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [sessionRenameText, setSessionRenameText] = useState('');
  const [editStudentForm, setEditStudentForm] = useState({
    name: '', seat_no: '', college_name: '', result: 'PASS', sgpa: '', percentage: ''
  });
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Diagnostic & broadcast forms
  const [smtpTargetEmail, setSmtpTargetEmail] = useState('');
  const [broadcastForm, setBroadcastForm] = useState({ active: false, message: '', type: 'info', maintenanceMode: false });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  // Load initial data
  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, sessRes, ticketsRes, annRes] = await Promise.all([
        api.getAdminStats().catch(() => ({ stats: null, auditLogs: [] })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAdminSessions().catch(() => ({ sessions: [] })),
        api.getAdminTickets().catch(() => ({ tickets: [] })),
        api.getAdminAnnouncement().catch(() => ({ announcement: { active: false, message: '', type: 'info', maintenanceMode: false } }))
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (statsRes?.auditLogs) setAuditLogs(statsRes.auditLogs);
      if (usersRes?.users) setUsers(usersRes.users);
      if (sessRes?.sessions) setSessions(sessRes.sessions);
      if (ticketsRes?.tickets) setTickets(ticketsRes.tickets);
      if (annRes?.announcement) {
        setAnnouncement(annRes.announcement);
        setBroadcastForm(annRes.announcement);
      }
    } catch (err) {
      showToast('Error synchronizing data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Fetch table explorer data when tab is explorer or selectedTable changes
  const fetchTableData = async (table) => {
    try {
      setTableLoading(true);
      const res = await api.getAdminTableExplorer(table, { limit: 50 });
      if (res.success) {
        setTableData({
          columns: res.columns || [],
          rows: res.rows || [],
          count: res.count || 0
        });
      }
    } catch (err) {
      showToast('Error querying database table: ' + err.message, 'error');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'explorer') {
      fetchTableData(selectedTable);
    }
  }, [activeTab, selectedTable]);

  // Search students
  const handleSearchStudents = async (e) => {
    if (e) e.preventDefault();
    try {
      setStudentSearchLoading(true);
      const res = await api.getAdminStudents({ q: studentSearchQ, limit: 50 });
      if (res.students) {
        setStudents(res.students);
      }
    } catch (err) {
      showToast('Student query error: ' + err.message, 'error');
    } finally {
      setStudentSearchLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students' && students.length === 0) {
      handleSearchStudents();
    }
  }, [activeTab]);

  // View marks for student
  const handleViewStudentMarks = async (student) => {
    setSelectedStudent(student);
    setShowStudentMarksModal(true);
    setMarksLoading(true);
    try {
      const res = await api.getAdminStudentMarks(student.id);
      setSelectedStudentMarks(res.marks || []);
    } catch (err) {
      showToast('Failed to fetch marks breakdown: ' + err.message, 'error');
      setSelectedStudentMarks([]);
    } finally {
      setMarksLoading(false);
    }
  };

  // Access check: Only superadmin or admin role allowed
  const isAdmin = user?.role === 'admin' || user?.username === 'sascma_admin' || user?.username === 'SascmaAdmin';
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Root Administrator Access Required</h1>
        <p className="text-slate-400 text-sm max-w-md mt-2">
          This portal is reserved strictly for SASCMA STERS system administrators. Unauthorized access attempts are monitored and recorded.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border border-slate-700"
        >
          <ArrowLeft size={16} /> Return to Faculty Dashboard
        </button>
      </div>
    );
  }

  // ==================== USER ACTIONS ====================
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.createAdminUser(newUserForm);
      showToast(res.message || 'User registered successfully.');
      setShowAddUserModal(false);
      setNewUserForm({ username: '', email: '', phone: '', college_name: '', course: 'All Courses', password: '', role: 'faculty' });
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      const res = await api.updateAdminUser(selectedUser.id, editUserForm);
      showToast(res.message || 'User details updated.');
      setShowEditUserModal(false);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'faculty' : 'admin';
    if ((targetUser.username === 'sascma_admin' || targetUser.username === 'SascmaAdmin') && newRole !== 'admin') {
      return showToast('Cannot demote root superadministrator.', 'error');
    }
    if (!window.confirm(`Change ${targetUser.username}'s role to ${newRole.toUpperCase()}?`)) return;

    try {
      setActionLoading(true);
      const res = await api.updateUserRole(targetUser.id, newRole);
      showToast(res.message || `Role updated to ${newRole}.`);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (targetUser.username === 'sascma_admin' || targetUser.username === 'SascmaAdmin') {
      return showToast('Root superadministrator cannot be suspended.', 'error');
    }
    try {
      setActionLoading(true);
      const res = await api.toggleAdminUserStatus(targetUser.id);
      showToast(res.message || `Account status updated.`);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      setActionLoading(true);
      const res = await api.adminResetPassword(selectedUser.id, newPassword);
      showToast(res.message || `Password updated for ${selectedUser.username}.`);
      setShowResetPassModal(false);
      setNewPassword('');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.username === 'sascma_admin' || targetUser.username === 'SascmaAdmin') {
      return showToast('Cannot delete root superadministrator account.', 'error');
    }
    if (!window.confirm(`PERMANENT ACTION: Delete user "${targetUser.username}"? This cannot be undone.`)) return;

    try {
      setActionLoading(true);
      const res = await api.deleteAdminUser(targetUser.id);
      showToast(res.message || 'User account removed.');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== SESSION ACTIONS ====================
  const handleRenameSession = async (e) => {
    e.preventDefault();
    if (!selectedSession || !sessionRenameText.trim()) return;
    try {
      setActionLoading(true);
      const res = await api.updateAdminSession(selectedSession.id, { session_name: sessionRenameText.trim() });
      showToast(res.message || 'Session renamed successfully.');
      setShowRenameSessionModal(false);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to rename session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSession = async (sess) => {
    if (!window.confirm(`CASCADE DELETE: Delete session "${sess.session_name}"? All student records and marks will be permanently removed.`)) return;

    try {
      setActionLoading(true);
      const res = await api.deleteAdminSession(sess.id);
      showToast(res.message || 'Session and associated records purged.');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to delete session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== STUDENT ACTIONS ====================
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      setActionLoading(true);
      const res = await api.updateAdminStudent(selectedStudent.id, editStudentForm);
      showToast(res.message || 'Student record updated.');
      setShowEditStudentModal(false);
      await handleSearchStudents();
    } catch (err) {
      showToast(err.message || 'Failed to update student', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async (stud) => {
    if (!window.confirm(`Delete record for student seat #${stud.seat_no} (${stud.name})?`)) return;
    try {
      setActionLoading(true);
      const res = await api.deleteAdminStudent(stud.id);
      showToast(res.message || 'Student record deleted.');
      await handleSearchStudents();
    } catch (err) {
      showToast(err.message || 'Failed to delete student', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== TICKET ACTIONS ====================
  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      setActionLoading(true);
      const res = await api.updateAdminTicketStatus(ticketId, status);
      showToast(res.message || `Ticket status updated to ${status}.`);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to update ticket status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplyTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim()) return;
    try {
      setActionLoading(true);
      const res = await api.replyAdminTicket(selectedTicket.id, ticketReplyText.trim());
      showToast(res.message || 'Resolution sent to applicant.');
      setShowReplyTicketModal(false);
      setTicketReplyText('');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to reply to ticket', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Delete this support ticket?')) return;
    try {
      setActionLoading(true);
      const res = await api.deleteAdminTicket(ticketId);
      showToast(res.message || 'Support ticket deleted.');
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to delete ticket', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ==================== DIAGNOSTICS & BROADCAST ====================
  const handleTestSmtp = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.testAdminSmtp(smtpTargetEmail || user?.email);
      showToast(res.message || 'Test email dispatched successfully.');
    } catch (err) {
      showToast(err.message || 'SMTP diagnostic failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveBroadcast = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.setAdminAnnouncement(broadcastForm);
      showToast(res.message || 'System broadcast announcement updated.');
      setAnnouncement(res.announcement);
    } catch (err) {
      showToast(err.message || 'Failed to update announcement', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchQ = (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (u.college_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchQ && matchRole;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-slate-950 font-sans">
      {/* Toast Notification Alert */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-semibold backdrop-blur-md transition-all transform animate-slide-in ${
          toast.type === 'error'
            ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
            : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ==================== 1. EXECUTIVE COMMAND BAR ==================== */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-indigo-500 to-purple-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-wide">SASCMA STERS</h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                  Root Administrator
                </span>
              </div>
              <p className="text-[11px] text-teal-400 font-semibold tracking-wide">University Administration & Database Engine</p>
            </div>
          </div>

          {/* Live System Vitals Pill */}
          <div className="hidden xl:flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Cloud DB Online
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-indigo-400 font-medium flex items-center gap-1">
              <Clock size={12} /> Up: {stats?.serverUptime || 'Active'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-medium flex items-center gap-1">
              <HardDrive size={12} /> RAM: {stats?.memoryUsageRss || 'Normal'}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-4 w-full sm:w-auto justify-end">
          {/* Quick Database Backup Button */}
          <a
            href="/api/admin/backup-db"
            download
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-xl transition-all shadow-sm"
            title="Download full JSON backup of all tables"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Backup Database</span>
          </a>

          {/* Switch to Public Faculty Dashboard */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all shadow-sm"
            title="Open student result visualization dashboard"
          >
            <ExternalLink size={14} className="text-teal-400" />
            <span>Faculty Portal</span>
          </button>

          {/* Admin User Chip & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-3 py-1.5 rounded-xl">
              <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-200 leading-tight">{user?.username}</p>
                <p className="text-[10px] text-teal-400 font-medium leading-tight">Super Administrator</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20"
              title="Sign Out of Workspace"
            >
              <UserX size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ==================== 2. ADMIN WORKSPACE BODY ==================== */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Dedicated Admin Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900/70 border-r border-slate-800/80 p-3 sm:p-4 flex-shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <div className="hidden md:block pb-2 px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Command Center
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity size={16} className={activeTab === 'overview' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Overview & Vitals</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Users size={16} className={activeTab === 'users' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Faculty & Users ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileSpreadsheet size={16} className={activeTab === 'sessions' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Exam Gazettes ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'students'
                ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <GraduationCap size={16} className={activeTab === 'students' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Student Database</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'explorer'
                ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Database size={16} className={activeTab === 'explorer' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Table Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'tickets'
                ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <MessageSquare size={16} className={activeTab === 'tickets' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Support Tickets ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'bg-gradient-to-r from-teal-500/20 to-teal-500/5 text-teal-300 border border-teal-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Radio size={16} className={activeTab === 'broadcast' ? 'text-teal-400' : 'text-slate-400'} />
            <span>Broadcast & Emergency</span>
          </button>

          {/* Sync Data at Bottom */}
          <div className="hidden md:block mt-auto pt-4 border-t border-slate-800/80">
            <button
              onClick={loadAllAdminData}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-teal-400' : 'text-slate-400'} />
              <span>Sync All Data</span>
            </button>
          </div>
        </aside>

        {/* Admin Main Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* ==================== TAB 1: OVERVIEW & VITALS ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">System Command Center</h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Live system telemetry, database status, and executive administration shortcuts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-500/20 transition-all"
                  >
                    <PlusCircle size={16} />
                    <span>Create User</span>
                  </button>
                  <a
                    href="/api/admin/backup-db"
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
                  >
                    <Download size={15} className="text-emerald-400" />
                    <span>Download JSON Backup</span>
                  </a>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Registered Accounts</span>
                    <Users size={18} className="text-teal-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.totalUsers ?? users.length}
                  </div>
                  <p className="text-[11px] text-teal-400 mt-1 font-medium">
                    {stats?.adminCount || 1} Admins • {stats?.facultyCount || (users.length - 1)} Faculty
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Exam Gazettes</span>
                    <FileSpreadsheet size={18} className="text-indigo-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.totalSessions ?? sessions.length}
                  </div>
                  <p className="text-[11px] text-indigo-400 mt-1 font-medium">
                    {stats?.totalStudents ?? 0} Students Ingested
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Marks Records</span>
                    <Layers size={18} className="text-purple-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {stats?.totalMarksRecords ?? 0}
                  </div>
                  <p className="text-[11px] text-purple-400 mt-1 font-medium">
                    Subject marks indexed in Supabase
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Server Diagnostics</span>
                    <Server size={18} className="text-emerald-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white mt-1">
                    {stats?.memoryUsageRss || 'Normal'}
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                    Node.js {stats?.nodeVersion || 'v20'} • Uptime: {stats?.serverUptime || 'Live'}
                  </p>
                </div>
              </div>

              {/* Server Telemetry & Activity Logs Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Diagnostics Box */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Terminal size={16} className="text-teal-400" /> Server Architecture & Database Vitals
                    </h3>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                      HEALTHY
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Cloud Database</span>
                      <span className="font-bold text-white">Supabase PostgreSQL</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Email Relay</span>
                      <span className="font-bold text-white">Gmail SMTP Service</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Node Process Uptime</span>
                      <span className="font-bold text-teal-400 font-mono">{stats?.serverUptime || 'Active'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Memory Allocation</span>
                      <span className="font-bold text-indigo-400 font-mono">{stats?.memoryUsageHeap || 'Normal'}</span>
                    </div>
                  </div>
                </div>

                {/* Audit & Activity Logs Box */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity size={16} className="text-indigo-400" /> Administrative Audit Log
                    </h3>
                    <span className="text-[10px] text-slate-400">Recent events</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {auditLogs.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-4">No recent activity logged.</div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-2 rounded-xl bg-slate-800/30 border border-slate-800/60 text-[11px] flex items-center justify-between">
                          <div>
                            <span className="font-bold text-teal-400 mr-2">[{log.action}]</span>
                            <span className="text-slate-300">{log.details}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: FACULTY & USERS (WITH ORIGINAL PASSWORDS) ==================== */}
          {activeTab === 'users' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Faculty & User Directory</h2>
                  <p className="text-xs text-slate-400">View original database passwords, update details, toggle roles, or suspend accounts.</p>
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
                >
                  <PlusCircle size={15} /> Add New User
                </button>
              </div>

              {/* Search & Role Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username, college, or email..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500 w-full sm:w-auto"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Administrators</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">College / Dept</th>
                        <th className="py-3 px-4">Phone / Contact</th>
                        <th className="py-3 px-4">Original Password</th>
                        <th className="py-3 px-4">Status & Role</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-slate-500">
                            No users matched your query.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold text-xs">
                                  {u.username[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-white">{u.username}</div>
                                  <div className="text-[10px] text-slate-400">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-300">{u.college_name || 'VNSGU'}</div>
                              <div className="text-[10px] text-slate-500">{u.course || 'All Courses'}</div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              {u.phone ? `+91 ${u.phone}` : '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">
                              <div className="flex items-center gap-2 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-800 max-w-[170px]">
                                <span className="truncate">
                                  {visiblePasswords[u.id] ? u.password : '••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(u.id)}
                                  className="text-slate-400 hover:text-teal-300 ml-auto"
                                  title={visiblePasswords[u.id] ? 'Hide password' : 'View original password'}
                                >
                                  {visiblePasswords[u.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(u.password, 'Password')}
                                  className="text-slate-400 hover:text-teal-300"
                                  title="Copy password"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleRole(u)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                    u.role === 'admin'
                                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                  title="Click to toggle role"
                                >
                                  {u.role === 'admin' ? 'ADMIN' : 'FACULTY'}
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                    u.status === 'Suspended'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  }`}
                                  title="Toggle account active/suspended"
                                >
                                  {u.status || 'Active'}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setEditUserForm({
                                      college_name: u.college_name || '',
                                      phone: u.phone || '',
                                      course: u.course || '',
                                      email: u.email || ''
                                    });
                                    setShowEditUserModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Edit User Info"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setNewPassword('');
                                    setShowResetPassModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Reset Password"
                                >
                                  <KeyRound size={15} />
                                </button>
                                {u.username !== 'sascma_admin' && u.username !== 'SascmaAdmin' && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 size={15} />
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
            </div>
          )}

          {/* ==================== TAB 3: EXAM SESSIONS ==================== */}
          {activeTab === 'sessions' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Examination Gazettes & Sessions</h2>
                  <p className="text-xs text-slate-400">View imported gazette sessions, rename titles, or purge database entries.</p>
                </div>
                <button
                  onClick={() => navigate('/upload')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
                >
                  <PlusCircle size={15} /> Upload New Gazette PDF
                </button>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Session Title</th>
                        <th className="py-3 px-4">Exam Details</th>
                        <th className="py-3 px-4">Total Students</th>
                        <th className="py-3 px-4">Uploaded Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-500">
                            No examination sessions recorded in the database.
                          </td>
                        </tr>
                      ) : (
                        sessions.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">
                              {s.session_name}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {s.exam_date || 'VNSGU Semester Examination'}
                            </td>
                            <td className="py-3 px-4 font-bold text-teal-400">
                              {s.total_students || 0}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {new Date(s.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedSession(s);
                                    setSessionRenameText(s.session_name);
                                    setShowRenameSessionModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Rename Session"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(s)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title="Cascade Delete Session"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: STUDENT RECORDS ==================== */}
          {activeTab === 'students' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Global Student Records & Marks Inspector</h2>
                  <p className="text-xs text-slate-400">Search students across all gazettes, inspect subject marks, or correct data.</p>
                </div>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchStudents} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={studentSearchQ}
                    onChange={(e) => setStudentSearchQ(e.target.value)}
                    placeholder="Search by Seat Number, Student Name, or College Name..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <Search size={15} className="absolute left-3 top-3 text-slate-500" />
                </div>
                <button
                  type="submit"
                  disabled={studentSearchLoading}
                  className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  {studentSearchLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>Search</span>
                </button>
              </form>

              {/* Students Table */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Seat No</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">College</th>
                        <th className="py-3 px-4">Result</th>
                        <th className="py-3 px-4">SGPA / %</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-slate-500">
                            {studentSearchLoading ? 'Searching database...' : 'No student records found. Enter a search query above.'}
                          </td>
                        </tr>
                      ) : (
                        students.map((stud) => (
                          <tr key={stud.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-teal-400">
                              #{stud.seat_no}
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {stud.name}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {stud.college_name || 'VNSGU'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                (stud.result || '').includes('PASS')
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {stud.result || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {stud.sgpa ? `SGPA ${stud.sgpa}` : stud.percentage ? `${stud.percentage}%` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleViewStudentMarks(stud)}
                                  className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-[11px] font-semibold border border-indigo-500/20"
                                  title="View Marks Breakdown"
                                >
                                  View Marks
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedStudent(stud);
                                    setEditStudentForm({
                                      name: stud.name || '',
                                      seat_no: stud.seat_no || '',
                                      college_name: stud.college_name || '',
                                      result: stud.result || 'PASS',
                                      sgpa: stud.sgpa || '',
                                      percentage: stud.percentage || ''
                                    });
                                    setShowEditStudentModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Edit Student Record"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(stud)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title="Delete Student Record"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 5: RAW DATABASE TABLE EXPLORER ==================== */}
          {activeTab === 'explorer' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-white">Live Database Table Explorer</h2>
                  <p className="text-xs text-slate-400">Directly inspect raw database rows and schema from Supabase PostgreSQL.</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/api/admin/backup-db"
                    download
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    <Download size={14} /> Full DB JSON Export
                  </a>
                </div>
              </div>

              {/* Table Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['profiles', 'import_sessions', 'students', 'student_marks'].map((tableName) => (
                  <button
                    key={tableName}
                    onClick={() => setSelectedTable(tableName)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedTable === tableName
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    public.{tableName}
                  </button>
                ))}
              </div>

              {/* Table Grid */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-md">
                <div className="p-3 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Table: <strong className="text-white">public.{selectedTable}</strong> • Total Rows: <strong className="text-teal-400">{tableData.count}</strong></span>
                  <button
                    onClick={() => fetchTableData(selectedTable)}
                    disabled={tableLoading}
                    className="flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold"
                  >
                    <RefreshCw size={13} className={tableLoading ? 'animate-spin' : ''} /> Refresh Table
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  {tableLoading ? (
                    <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-teal-400" /> Loading table data...
                    </div>
                  ) : tableData.rows.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      Table is currently empty.
                    </div>
                  ) : (
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-800/80 text-slate-300 sticky top-0 border-b border-slate-700">
                        <tr>
                          {tableData.columns.map(col => (
                            <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {tableData.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            {tableData.columns.map(col => (
                              <td key={col} className="py-2 px-3 whitespace-nowrap max-w-xs truncate">
                                {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: SUPPORT TICKETS ==================== */}
          {activeTab === 'tickets' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Help Desk & Support Inquiries</h2>
                  <p className="text-xs text-slate-400">Manage inquiries, student questions, and mark correction requests.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Tracking ID</th>
                        <th className="py-3 px-4">Applicant</th>
                        <th className="py-3 px-4">Subject & Message</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-8 text-slate-500">
                            No support tickets submitted.
                          </td>
                        </tr>
                      ) : (
                        tickets.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                              {t.tracking_id || `TCK-${t.id}`}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-white">{t.name}</div>
                              <div className="text-[10px] text-slate-400">{t.email}</div>
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate">
                              <div className="font-semibold text-slate-200">{t.subject}</div>
                              <div className="text-[11px] text-slate-400 truncate">{t.message}</div>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={t.status}
                                onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-[11px] rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedTicket(t);
                                    setShowReplyTicketModal(true);
                                  }}
                                  className="p-1.5 text-teal-400 hover:bg-slate-800 rounded-lg"
                                  title="Send Reply"
                                >
                                  <Send size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTicket(t.id)}
                                  className="p-1.5 text-rose-400 hover:bg-slate-800 rounded-lg"
                                  title="Delete Ticket"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 7: BROADCAST & EMERGENCY ==================== */}
          {activeTab === 'broadcast' && (
            <div className="space-y-6 animate-fade-in max-w-3xl">
              <div>
                <h2 className="text-xl font-black text-white">System Broadcast & Emergency Control</h2>
                <p className="text-xs text-slate-400">Publish institution-wide notices, maintenance toggles, and run SMTP diagnostics.</p>
              </div>

              {/* Broadcast Announcement Form */}
              <form onSubmit={handleSaveBroadcast} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio size={16} className="text-teal-400" /> Live University Broadcast Banner
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="broadcastActive"
                      checked={broadcastForm.active}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, active: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-500 bg-slate-800 border-slate-700"
                    />
                    <label htmlFor="broadcastActive" className="text-xs font-bold text-white cursor-pointer">
                      Enable Banner
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Banner Type</label>
                  <select
                    value={broadcastForm.type}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="info">Information (Blue)</option>
                    <option value="warning">Notice / Warning (Amber)</option>
                    <option value="alert">Critical / Urgent (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Announcement Text</label>
                  <textarea
                    rows="3"
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    placeholder="e.g., Final Semester B.Com Gazette results have been published."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Save size={15} />
                  <span>Save Broadcast Settings</span>
                </button>
              </form>

              {/* SMTP Diagnostic Tester */}
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-md">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Live SMTP Diagnostic Mailer</h3>
                    <p className="text-xs text-slate-400">Send a test email to verify Gmail SMTP server delivery.</p>
                  </div>
                </div>

                <form onSubmit={handleTestSmtp} className="flex gap-2">
                  <input
                    type="email"
                    value={smtpTargetEmail}
                    onChange={(e) => setSmtpTargetEmail(e.target.value)}
                    placeholder={user?.email || 'admin@example.com'}
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Send Test</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================== MODAL: ADD USER ==================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle size={16} className="text-teal-400" /> Create New Faculty / Admin Account
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Username (min 6 chars)</label>
                <input
                  type="text"
                  required
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  placeholder="e.g. prof_sharma"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="name@gmail.com or faculty@vnsgu.ac.in"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Mobile Number (10 digits)</label>
                <input
                  type="tel"
                  required
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">College / Department</label>
                <input
                  type="text"
                  value={newUserForm.college_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, college_name: e.target.value })}
                  placeholder="Department of Computer Science"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="faculty">Faculty</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Password</label>
                  <input
                    type="text"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="e.g. Sascma@2026"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT USER ==================== */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 size={16} className="text-teal-400" /> Edit Profile: {selectedUser.username}
              </h3>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">College Name</label>
                <input
                  type="text"
                  value={editUserForm.college_name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, college_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Email</label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Phone</label>
                <input
                  type="tel"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: RESET PASSWORD ==================== */}
      {showResetPassModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound size={16} className="text-amber-400" /> Reset Password for {selectedUser.username}
              </h3>
              <button onClick={() => setShowResetPassModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <p className="text-slate-400 text-[11px]">
                Original password will be directly updated and preserved in the database.
              </p>
              <div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (e.g. Pass@123)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  {actionLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: STUDENT MARKS BREAKDOWN ==================== */}
      {showStudentMarksModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GraduationCap size={16} className="text-teal-400" /> Subject Marks: {selectedStudent.name}
                </h3>
                <p className="text-[11px] text-slate-400">Seat #{selectedStudent.seat_no} • {selectedStudent.college_name || 'VNSGU'}</p>
              </div>
              <button onClick={() => setShowStudentMarksModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {marksLoading ? (
                <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-teal-400" /> Loading marks breakdown...
                </div>
              ) : selectedStudentMarks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No individual subject marks recorded for this student.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Ext</th>
                      <th className="py-2.5 px-3">Int</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {selectedStudentMarks.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-sans font-semibold text-white">{m.subject_name || m.subject_code}</td>
                        <td className="py-2 px-3 text-slate-300">{m.external_marks ?? '—'}</td>
                        <td className="py-2 px-3 text-slate-300">{m.internal_marks ?? '—'}</td>
                        <td className="py-2 px-3 font-bold text-teal-400">{m.total_marks ?? '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.grade === 'F' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {m.grade || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800 flex-shrink-0">
              <button
                onClick={() => setShowStudentMarksModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT STUDENT ==================== */}
      {showEditStudentModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 size={16} className="text-teal-400" /> Edit Student Record #{selectedStudent.seat_no}
              </h3>
              <button onClick={() => setShowEditStudentModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Student Name</label>
                <input
                  type="text"
                  value={editStudentForm.name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Seat Number</label>
                  <input
                    type="text"
                    value={editStudentForm.seat_no}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, seat_no: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Result Status</label>
                  <select
                    value={editStudentForm.result}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, result: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="ATKT">ATKT</option>
                    <option value="WH">WH (Withheld)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">SGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editStudentForm.sgpa}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, sgpa: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Percentage</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editStudentForm.percentage}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, percentage: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  {actionLoading ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: RENAME SESSION ==================== */}
      {showRenameSessionModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 size={16} className="text-teal-400" /> Rename Exam Session
              </h3>
              <button onClick={() => setShowRenameSessionModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenameSession} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={sessionRenameText}
                  onChange={(e) => setSessionRenameText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRenameSessionModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  {actionLoading ? 'Updating...' : 'Save Title'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: REPLY TICKET ==================== */}
      {showReplyTicketModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send size={16} className="text-teal-400" /> Resolution Reply to {selectedTicket.name}
              </h3>
              <button onClick={() => setShowReplyTicketModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReplyTicket} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-300">
                <p className="font-bold text-white mb-1">Subject: {selectedTicket.subject}</p>
                <p className="text-[11px] text-slate-400">{selectedTicket.message}</p>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Your Resolution Response</label>
                <textarea
                  rows="3"
                  required
                  value={ticketReplyText}
                  onChange={(e) => setTicketReplyText(e.target.value)}
                  placeholder="Type official response..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReplyTicketModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md"
                >
                  {actionLoading ? 'Sending...' : 'Send Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
