import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  FileSpreadsheet,
  UploadCloud,
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

  if (!loading && (!hasUploaded || stats.total === 0)) {
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

      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 kpi-grid">
        <StatCard
          title="Total Registered"
          value={stats.total}
          subtext="Students in uploaded gazette"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Passed Candidates"
          value={stats.passed}
          subtext={`${stats.pass_percentage}% success rate`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Backlogs / ATKT"
          value={stats.atkt}
          subtext="Eligible for re-exam"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Failed / Detained"
          value={stats.failed}
          subtext="Academic risk category"
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Batch Average SGPA"
          value={stats.avg_sgpa}
          subtext="Out of 10.0 scale"
          icon={Award}
          color="blue"
        />
        <StatCard
          title="Participating Colleges"
          value={stats.colleges_count}
          subtext="Institutions enrolled"
          icon={Building2}
          color="teal"
        />
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
    </div>
  );
};
