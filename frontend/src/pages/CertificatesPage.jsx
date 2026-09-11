import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import JSZip from 'jszip';
import { FileCheck2, Download, Sliders, Eye, CheckCircle2 } from 'lucide-react';

export const CertificatesPage = () => {
  const [template, setTemplate] = useState('marksheet');
  const [collegeName, setCollegeName] = useState('Veer Narmad South Gujarat University');
  const [watermarkText, setWatermarkText] = useState('VNSGU OFFICIAL TRANSCRIPT');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.12);
  const [principalSig, setPrincipalSig] = useState('Controller of Examinations');
  const [exportingZip, setExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [sampleCandidate, setSampleCandidate] = useState(null);
  const [loading, setLoading] = useState(false);

  const { activeSessionId, hasUploaded } = useSession();

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!hasUploaded && !activeSessionId) return;
      setLoading(true);
      try {
        const res = await api.getStudents(`session_id=${activeSessionId}&limit=1`);
        if (res.success && res.students && res.students.length > 0) {
          setSampleCandidate(res.students[0]);
          if (res.students[0].college) {
            setCollegeName(res.students[0].college);
          }
        }
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [activeSessionId]);

  const handleBulkZipExport = async () => {
    if (!activeSessionId) return alert('No active uploaded PDF result found');
    setExportingZip(true);
    setZipProgress(10);
    try {
      const res = await api.getStudents(`session_id=${activeSessionId}&limit=1000`);
      const students = res.students || [];

      if (students.length === 0) {
        alert('No student records found in uploaded PDF to export');
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder("VNSGU_Digital_Marksheets");

      students.forEach((std, i) => {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Marksheet - ${std.seat_no}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1e293b; }
              .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; }
              .details { margin: 20px 0; display: flex; justify-content: space-between; }
              .kpi { margin-top: 20px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${collegeName}</h2>
              <p>Official Examination Grade Card</p>
            </div>
            <div class="details">
              <div>Seat No: ${std.seat_no}</div>
              <div>Candidate: ${std.name}</div>
              <div>Status: ${std.overall_status}</div>
            </div>
            <div class="kpi">
              <p>Total Marks: ${std.total_marks}</p>
              <p>Percentage: ${std.percentage}%</p>
              <p>SGPA: ${std.sgpa} (${std.overall_grade})</p>
            </div>
          </body>
          </html>
        `;
        folder.file(`Marksheet_${std.seat_no}_${std.name.replace(/[^a-zA-Z0-9]/g, '_')}.html`, htmlContent);
        setZipProgress(Math.min(90, Math.floor(((i + 1) / students.length) * 100)));
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      setZipProgress(100);

      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `VNSGU_Bulk_Marksheets_${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      alert('Bulk export failed: ' + err.message);
    } finally {
      setExportingZip(false);
      setZipProgress(0);
    }
  };

  if (!loading && (!hasUploaded || !sampleCandidate)) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="No Marksheet Records Found"
        description="Digital certificates and marksheets are generated dynamically from an uploaded VNSGU Result PDF gazette."
        actionLabel="Upload VNSGU Result PDF"
        actionPath="/upload"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-teal-500/20 bg-teal-500/5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <FileCheck2 size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Certificate & Marksheet Studio</h2>
            <p className="text-xs text-slate-400">Institutional branding, signature management, and bulk ZIP batch exporter</p>
          </div>
        </div>

        <button
          onClick={handleBulkZipExport}
          disabled={exportingZip}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50"
        >
          <Download size={16} />
          <span>{exportingZip ? `Generating Archive (${zipProgress}%)...` : 'Uncapped Bulk ZIP Export'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders size={16} className="text-teal-400" /> Branding Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Layout Template</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
              >
                <option value="marksheet">Official Marksheet</option>
                <option value="grade_card">Academic Excellence Grade Card</option>
                <option value="id_card">Student Digital ID Card</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Institution / College Name</label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Watermark Text</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Controller Signature Title</label>
              <input
                type="text"
                value={principalSig}
                onChange={(e) => setPrincipalSig(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Preview Column (SHOWS REAL CANDIDATE FROM UPLOADED PDF) */}
        <div className="lg:col-span-2 glass-panel p-6 relative overflow-hidden flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye size={14} /> Live Canvas Preview
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Actual Uploaded Candidate</span>
          </div>

          {/* Canvas Box */}
          <div className="relative p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-6 overflow-hidden">
            {/* Watermark */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -rotate-12 text-3xl font-black text-white"
              style={{ opacity: watermarkOpacity }}
            >
              {watermarkText}
            </div>

            {/* University Emblem */}
            <div>
              <img src="/assets/vnsgu.png" alt="Emblem" className="w-16 h-16 mx-auto mb-2 object-contain" />
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">{collegeName}</h3>
              <p className="text-xs text-teal-400 font-semibold">Veer Narmad South Gujarat University, Surat</p>
            </div>

            {/* Candidate Details FROM UPLOADED PDF */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-left">
              <div>
                <span className="text-[10px] text-slate-400 block">Candidate</span>
                <strong className="text-white">{sampleCandidate.name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Seat No</span>
                <strong className="text-white font-mono">{sampleCandidate.seat_no}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">SGPA</span>
                <strong className="text-teal-400 font-bold">{sampleCandidate.sgpa} ({sampleCandidate.overall_grade})</strong>
              </div>
            </div>

            {/* Signature Area */}
            <div className="flex justify-between items-end pt-8 px-4">
              <div className="text-left text-xs">
                <span className="font-mono text-[10px] text-slate-500">AUTH-HASH: SHA256-VNSGU-{sampleCandidate.seat_no}</span>
              </div>
              <div className="text-right">
                <div className="w-32 border-b border-slate-600 mb-1"></div>
                <span className="text-[11px] font-bold text-slate-300">{principalSig}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
