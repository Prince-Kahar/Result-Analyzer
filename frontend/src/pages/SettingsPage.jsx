import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Settings, Shield, User, Key, CheckCircle2 } from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.updateProfile({ phone });
      setSavedMsg('Profile updated successfully!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      await api.updatePassword({ new_password: newPassword });
      setSavedMsg('Password updated successfully!');
      setNewPassword('');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-3 p-4 glass-panel">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
          <Settings size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Faculty Account & System Settings</h2>
          <p className="text-xs text-slate-400">Manage profile credentials and database connection preferences</p>
        </div>
      </div>

      {savedMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold">
          <CheckCircle2 size={16} />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Profile Info */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <User size={16} className="text-teal-400" /> Account Profile
        </h3>
        <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Username</label>
            <input
              type="text"
              disabled
              value={user?.username || ''}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl"
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Key size={16} className="text-sky-400" /> Security & Password
        </h3>
        <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};
