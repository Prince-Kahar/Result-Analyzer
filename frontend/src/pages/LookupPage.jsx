import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { MarksheetModal } from '../components/MarksheetModal';
import { EmptyState } from '../components/EmptyState';
import { cleanStudentName } from '../utils/studentUtils';
import { Search, Eye, Filter, Building2, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';

export const LookupPage = () => {
  const [students, setStudents] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState('ALL');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selectedStudentReport, setSelectedStudentReport] = useState(null);
  const [modalLoading, setModalLoading] = useState(null);

  const { activeSessionId, hasUploaded } = useSession();

  // 1. Fetch available colleges for dropdown filter
  useEffect(() => {
    const fetchColleges = async () => {
      if (!hasUploaded && !activeSessionId) return;
      try {
        const params = new URLSearchParams();
        if (activeSessionId) params.append('session_id', activeSessionId);
        const res = await api.getColleges(params.toString());
        if (res && res.success && Array.isArray(res.colleges)) {
          setColleges(res.colleges);
        }
      } catch (err) {
        console.error('Failed to fetch colleges for lookup filter:', err);
      }
    };
    fetchColleges();
  }, [activeSessionId, hasUploaded]);

  // 2. Fetch students list with search, college and status filters
  const fetchStudents = async () => {
    if (!hasUploaded && !activeSessionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSessionId) params.append('session_id', activeSessionId);
      if (search) params.append('search', search);
      if (status !== 'ALL') params.append('status', status);
      if (selectedCollege && selectedCollege !== 'ALL') params.append('college', selectedCollege);
      params.append('page', page);
      params.append('limit', 25);

      const res = await api.getStudents(params.toString());
      if (res && res.success) {
        setStudents(res.students || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [activeSessionId, search, status, selectedCollege, page]);

  // 3. Action button handler to open marksheet transcript modal
  const handleOpenStudent = async (studentId) => {
    setModalLoading(studentId);
    try {
      const res = await api.getStudentReport(studentId);
      if (res && res.success) {
        setSelectedStudentReport(res);
      } else {
        alert(res?.message || 'Could not load student transcript');
      }
    } catch (err) {
      console.error('Error opening student report:', err);
      alert('Failed to load student transcript: ' + (err.message || 'Network error'));
    } finally {
      setModalLoading(null);
    }
  };

  if (!loading && (!hasUploaded || (total === 0 && !search && selectedCollege === 'ALL' && status === 'ALL'))) {
    return (
      <EmptyState
        icon={Search}
        title="No Students Available"
        description="Student marks and search directory are loaded dynamically from an uploaded VNSGU Result PDF gazette. Please upload a PDF first."
        actionLabel="Upload VNSGU Result PDF"
        actionPath="/upload"
      />
    );
  }

  const totalPages = Math.ceil(total / 25) || 1;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="text-teal-400" size={22} />
            <span>Student Lookup Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Search, filter by college, and inspect verified marksheet transcripts.
          </p>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Found <strong className="text-teal-300 font-bold">{total}</strong> Students</span>
          {colleges.length > 0 && (
            <span>across <strong className="text-amber-300 font-bold">{colleges.length}</strong> Colleges</span>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student by name, seat number, or SPID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* College Dropdown Filter */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <Building2 size={16} className="text-teal-400 flex-shrink-0" />
            <select
              value={selectedCollege}
              onChange={(e) => { setSelectedCollege(e.target.value); setPage(1); }}
              className="w-full sm:w-64 px-3 py-2 text-xs font-semibold bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 truncate"
              title="Filter by College / Department"
            >
              <option value="ALL">All Colleges ({colleges.length})</option>
              {colleges.map((c) => (
                <option key={c} value={c} title={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome Status Dropdown Filter */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Filter size={16} className="text-slate-400 flex-shrink-0" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs font-semibold bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Outcomes</option>
              <option value="PASS">Pass Only</option>
              <option value="ATKT">ATKT / Backlog Only</option>
              <option value="FAIL">Fail Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-panel overflow-hidden border border-slate-800">
        <div className="responsive-table-wrapper">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/90 text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Seat No</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">College / Department</th>
                <th className="p-3.5 text-center">Marks</th>
                <th className="p-3.5 text-center">Percentage</th>
                <th className="p-3.5 text-center">SGPA</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-teal-300">{s.seat_no}</td>
                  <td className="p-3.5 text-slate-100 font-bold whitespace-nowrap">
                    {cleanStudentName(s.name)}
                  </td>
                  <td className="p-3.5 text-slate-300 max-w-[240px]" title={s.college}>
                    <span className="line-clamp-2 text-[11px] font-normal leading-relaxed">
                      {s.college || 'VNSGU Affiliated Department'}
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-bold text-white whitespace-nowrap">
                    {s.total_marks}
                  </td>
                  <td className="p-3.5 text-center font-black text-amber-400 whitespace-nowrap">
                    {s.percentage}%
                  </td>
                  <td className="p-3.5 text-center font-black text-teal-300 whitespace-nowrap">
                    {s.sgpa}
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      s.overall_status === 'PASS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      s.overall_status === 'ATKT' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {s.overall_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleOpenStudent(s.id)}
                      disabled={modalLoading === s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      title="View Student Marksheet & Transcript"
                    >
                      {modalLoading === s.id ? (
                        <span className="animate-spin w-3.5 h-3.5 border-2 border-teal-300 border-t-transparent rounded-full" />
                      ) : (
                        <Eye size={14} />
                      )}
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    No matching student records found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-slate-900/60 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{students.length}</strong> of{' '}
            <strong className="text-white">{total}</strong> Records
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span className="px-2 font-medium">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold disabled:opacity-40 transition-colors"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Verified Marksheet Modal */}
      {selectedStudentReport && (
        <MarksheetModal
          isOpen={Boolean(selectedStudentReport)}
          onClose={() => setSelectedStudentReport(null)}
          data={selectedStudentReport}
          studentData={selectedStudentReport}
        />
      )}
    </div>
  );
};
