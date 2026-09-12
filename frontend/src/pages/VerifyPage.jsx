import { cleanStudentName } from '../utils/studentUtils';
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Search, CheckCircle2, XCircle, QrCode, FileText } from 'lucide-react';

export const VerifyPage = () => {
  const [queryId, setQueryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Check URL query param e.g. ?id=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setQueryId(id);
      verifyCandidate(id);
    }
  }, []);

  const verifyCandidate = async (idToVerify) => {
    if (!idToVerify) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.verifyStudent(idToVerify);
      if (res.success && res.verified) {
        setResult(res);
      } else {
        setError(res.message || 'Verification record not found');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to verification server');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyCandidate(queryId.trim());
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black text-white">Public Credential Verification Portal</h2>
        <p className="text-xs text-slate-400">
          Veer Narmad South Gujarat University • Anti-Tamper Digital Marksheet Authentication
        </p>
      </div>

      {/* Verification Lookup Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            required
            placeholder="Enter Seat Number (e.g. 1001) or Student ID..."
            value={queryId}
            onChange={(e) => setQueryId(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify Now'}
        </button>
      </form>

      {/* Not Found Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs">
          <XCircle size={20} className="flex-shrink-0 text-rose-400" />
          <div>
            <p className="font-bold">Credential Verification Failed</p>
            <p className="text-[11px] text-slate-400">{error}</p>
          </div>
        </div>
      )}

      {/* Authenticated Verification Card */}
      {result && result.student && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 border-teal-500/40 bg-slate-900/90 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={20} />
              <span>Authentic University Credential</span>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 rounded-full">
              STATUS: VALID
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Student Name</span>
              <h3 className="text-xl font-black text-white">{result.student.name}</h3>
              <p className="text-xs text-teal-400 font-semibold">{result.student.college}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Seat No</span>
                <strong className="text-white font-mono">{result.student.seat_no}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SPID</span>
                <strong className="text-white font-mono">{result.student.sp_id}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SGPA</span>
                <strong className="text-sky-400 font-bold">{result.student.sgpa}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Overall Status</span>
                <strong className={result.student.overall_status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}>
                  {result.student.overall_status}
                </strong>
              </div>
            </div>

            {/* Subject marks preview */}
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5 text-center">INT /30</th>
                    <th className="p-2.5 text-center">EXT /70</th>
                    <th className="p-2.5 text-center">TOT /100</th>
                    <th className="p-2.5 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {result.student.subjects?.map((sub, i) => (
                    <tr key={i}>
                      <td className="p-2.5 text-white">{sub.subject_name}</td>
                      <td className="p-2.5 text-center text-slate-300">{sub.int_mark}</td>
                      <td className="p-2.5 text-center text-slate-300">{sub.ext_mark}</td>
                      <td className="p-2.5 text-center font-bold text-white">{sub.total_mark}</td>
                      <td className="p-2.5 text-center font-bold text-teal-400">{sub.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Anti-tamper Hash */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-[10px] space-y-1">
              <span className="text-slate-500 block uppercase">Cryptographic Audit Fingerprint:</span>
              <p className="text-teal-400 break-all">{result.verification_hash}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
