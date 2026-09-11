import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { MarksheetModal } from '../components/MarksheetModal';
import { EmptyState } from '../components/EmptyState';
import { Search, Eye, Filter } from 'lucide-react';

export const LookupPage = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedStudentReport, setSelectedStudentReport] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const { activeSessionId, hasUploaded } = useSession();

  const fetchStudents = async () => {
    if (!hasUploaded && !activeSessionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSessionId) params.append('session_id', activeSessionId);
      if (search) params.append('search', search);
      if (status !== 'ALL') params.append('status', status);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.getStudents(params.toString());
      if (res.success) {
        setStudents(res.students || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [activeSessionId, search, status, page]);

  const handleOpenStudent = async (studentId) => {
    setModalLoading(true);
    try {
      const res = await api.getStudentReport(studentId);
      if (res.success) {
        setSelectedStudentReport(res);
      }
    } catch (err) {
      alert('Failed to load candidate transcript');
    } finally {
      setModalLoading(false);
    }
  };

  if (!loading && (!hasUploaded || total === 0 && !search)) {
    return (
      <EmptyState
        icon={Search}
        title="No Students Available"
        description="Candidate marks and search index are loaded dynamically from an uploaded VNSGU Result PDF gazette. Please upload a PDF first."
        actionLabel="Upload VNSGU Result PDF"
        actionPath="/upload"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Filter Header */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate by name, seat number, or SPID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs font-semibold bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="PASS">Pass Only</option>
            <option value="ATKT">ATKT / Backlog Only</option>
            <option value="FAIL">Fail Only</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-panel overflow-hidden">
        <div className="responsive-table-wrapper">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Seat No</th>
                <th className="p-3">Candidate Name</th>
                <th className="p-3">College / Dept</th>
                <th className="p-3 text-center">Marks</th>
                <th className="p-3 text-center">Percentage</th>
                <th className="p-3 text-center">SGPA</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-mono font-bold text-white">{s.seat_no}</td>
                  <td className="p-3 text-slate-200 font-bold">{s.name}</td>
                  <td className="p-3 text-slate-400 max-w-[200px] truncate">{s.college}</td>
                  <td className="p-3 text-center font-bold text-white">{s.total_marks}</td>
                  <td className="p-3 text-center font-black text-amber-400">{s.percentage}%</td>
                  <td className="p-3 text-center font-black text-teal-300">{s.sgpa}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      s.overall_status === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      s.overall_status === 'ATKT' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {s.overall_status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenStudent(s.id)}
                      className="p-1.5 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="View Marksheet"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No matching candidate records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-3 bg-slate-900/50 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Total Records: <strong className="text-white">{total}</strong></span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-slate-800 rounded-lg text-white disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page} of {Math.ceil(total / 25) || 1}</span>
            <button
              disabled={page >= Math.ceil(total / 25)}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-slate-800 rounded-lg text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Modal */}
      {selectedStudentReport && (
        <MarksheetModal
          isOpen={Boolean(selectedStudentReport)}
          onClose={() => setSelectedStudentReport(null)}
          studentData={selectedStudentReport}
        />
      )}
    </div>
  );
};
