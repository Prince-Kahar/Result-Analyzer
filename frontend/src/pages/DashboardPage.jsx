import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { ResultShareModal } from '../components/ResultShareModal';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  FileSpreadsheet,
  UploadCloud,
  Share2,
  RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCollege, setSelectedCollege] = useState('ALL');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const { activeSessionId, setActiveSessionId, sessions, hasUploaded } = useSession();
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSessionId) params.append('session_id', activeSessionId);
      if (selectedCollege && selectedCollege !== 'ALL') params.append('college', selectedCollege);

      const res = await api.getDashboard(params.toString());
      if (res.success) {
        setData(res);
        if (res.session_id && !activeSessionId) {
          setActiveSessionId(res.session_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeSessionId, selectedCollege]);

  const stats = data?.stats || {
    total: 0, appeared: 0, passed: 0, failed: 0, atkt: 0,
    pass_percentage: 0, avg_sgpa: 0, colleges_count: 0
  };

  const rawSummary = data?.result_summary || null;

  // Compute Gazette Summary adhering strictly to the zero rule:
  // TOTAL RESULT, TOTAL PASS, and FAIL always show (even if 0).
  // All other fields (ABSENT, FORM WITHDRAWN, etc.) show ONLY if > 0.
  const summaryList = React.useMemo(() => {
    if (!rawSummary && !stats.total) return [];

    const totalRes = rawSummary?.total_result 
      ? String(rawSummary.total_result) 
      : (stats.total > 0 ? `${stats.pass_percentage}%` : '0.00 %');
    const passCount = rawSummary?.total_pass !== undefined ? rawSummary.total_pass : stats.passed;
    const failCount = rawSummary?.fail !== undefined ? rawSummary.fail : (stats.failed + (stats.atkt || 0));

    const candidates = [
      {
        key: 'total_result',
        label: 'TOTAL RESULT',
        value: totalRes.includes('%') ? totalRes : `${totalRes} %`,
        alwaysShow: true,
        color: 'text-teal-400'
      },
      {
        key: 'total_pass',
        label: 'TOTAL PASS',
        value: String(passCount),
        alwaysShow: true,
        color: 'text-emerald-400'
      },
      {
        key: 'fail',
        label: 'FAIL',
        value: String(failCount),
        alwaysShow: true,
        color: 'text-rose-400'
      },
      {
        key: 'absent',
        label: 'ABSENT',
        value: String(rawSummary?.absent ?? 0),
        alwaysShow: false,
        color: 'text-amber-400'
      },
      {
        key: 'form_withdrawn',
        label: 'FORM WITHDRAWN',
        value: String(rawSummary?.form_withdrawn ?? 0),
        alwaysShow: false,
        color: 'text-slate-300'
      },
      {
        key: 'reserved',
        label: 'RESERVED',
        value: String(rawSummary?.reserved ?? 0),
        alwaysShow: false,
        color: 'text-purple-400'
      },
      {
        key: 'withheld',
        label: 'WITHHELD',
        value: String(rawSummary?.withheld ?? 0),
        alwaysShow: false,
        color: 'text-orange-400'
      },
      {
        key: 'dlo',
        label: 'D.L.O.',
        value: String(rawSummary?.dlo ?? 0),
        alwaysShow: false,
        color: 'text-yellow-400'
      },
      {
        key: 'cancelled',
        label: 'CANCELLED',
        value: String(rawSummary?.cancelled ?? 0),
        alwaysShow: false,
        color: 'text-red-400'
      },
      {
        key: 'wo_165',
        label: 'W.O. 165',
        value: String(rawSummary?.wo_165 ?? 0),
        alwaysShow: false,
        color: 'text-pink-400'
      },
      {
        key: 'dlo_fec',
        label: 'D.L.O FEC',
        value: String(rawSummary?.dlo_fec ?? 0),
        alwaysShow: false,
        color: 'text-indigo-400'
      }
    ];

    return candidates.filter(item => {
      if (item.alwaysShow) return true;
      const num = parseInt(item.value, 10);
      return !isNaN(num) && num > 0;
    });
  }, [rawSummary, stats]);

  if (!loading && stats.total === 0) {
    return (
      <EmptyState
        title="No Examination Result Uploaded Yet"
        description="Your dashboard displays live insights computed exclusively from an uploaded VNSGU Result PDF gazette. Please upload a PDF to begin."
        actionLabel="Upload VNSGU Result PDF Now"
        actionPath="/upload"
      />
    );
  }

  // Grade Bar Chart Data
  const gradeDist = data?.grade_distribution || { 'O': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C': 0, 'F': 0 };
  const gradeChartData = {
    labels: Object.keys(gradeDist),
    datasets: [
      {
        label: 'Students Count',
        data: Object.values(gradeDist),
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(13, 148, 136, 0.85)',
          'rgba(2, 132, 199, 0.85)',
          'rgba(99, 102, 241, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(249, 115, 22, 0.85)',
          'rgba(239, 68, 68, 0.85)',
        ],
        borderRadius: 8,
      }
    ]
  };

  // Status Donut Chart Data
  const statusChartData = {
    labels: ['Pass', 'ATKT', 'Fail'],
    datasets: [
      {
        data: [stats.passed, stats.atkt, stats.failed],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 glass-panel">
        <div className="flex flex-wrap items-center gap-3">
          {/* Session Selector */}
          {sessions && sessions.length > 1 && (
            <select
              value={activeSessionId}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.course} - {s.semester}
                </option>
              ))}
            </select>
          )}

          {/* College Filter */}
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 max-w-[200px] truncate"
          >
            <option value="ALL">All Colleges</option>
            {data?.colleges?.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl shadow-sm transition-all"
            title="Faculty WhatsApp Summary"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">WhatsApp Summary</span>
          </button>

          <button
            type="button"
            onClick={fetchDashboard}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl border border-slate-700/60"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-500/20 transition-all"
          >
            <UploadCloud size={16} />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid (Gazette Result Summary + Academic Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 kpi-grid">
        {/* Dynamic Gazette Result Summary Cards */}
        {summaryList.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col justify-between min-h-[125px] shadow-sm"
          >
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
              {item.label}
            </div>
            <div className={`text-2xl sm:text-3xl font-black mt-3 font-mono tracking-tight ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}

        {/* Batch Average SGPA */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col justify-between min-h-[125px] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
              BATCH AVERAGE SGPA
            </div>
            <Award className="text-blue-400/70" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-3 font-mono tracking-tight text-blue-400">
            {stats.avg_sgpa}
          </div>
        </div>

        {/* Participating Colleges */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col justify-between min-h-[125px] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
              PARTICIPATING COLLEGES
            </div>
            <Building2 className="text-teal-400/70" size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-3 font-mono tracking-tight text-teal-400">
            {stats.colleges_count}
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 charts-grid">
        {/* Grade Distribution */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Grade Distribution Matrix</h3>
            <span className="text-[11px] text-teal-400 font-semibold uppercase">O to F Scale</span>
          </div>
          <div className="h-64">
            <Bar
              data={gradeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                  y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                }
              }}
            />
          </div>
        </div>

        {/* Pass / ATKT / Fail Breakdown */}
        <div className="glass-panel p-5 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Result Composition</h3>
            <p className="text-xs text-slate-400">Pass, ATKT, and Failure distribution</p>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            {stats.total > 0 ? (
              <Doughnut
                data={statusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '70%',
                  plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } }
                }}
              />
            ) : (
              <p className="text-xs text-slate-500">No session data loaded</p>
            )}
          </div>
        </div>
      </div>
      <ResultShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        stats={stats}
        session={data?.session || {}}
        college={selectedCollege}
      />
    </div>
  );
};
