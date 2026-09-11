# 🎓 SASCMA Student Result Analyzer & Academic Intelligence Suite (Redesigned)
### Veer Narmad South Gujarat University (VNSGU)
**Redesigned Full-Stack Web Application (React + Node.js + Supabase)**

---

## 🌟 Overview
This redesigned platform modernizes the VNSGU Student Result Analyzer into a decoupled, high-performance architecture:
- **Frontend**: **React 18** (Vite + JavaScript) with an ultra-responsive Glassmorphism design system optimized for Mobile, Tablet, and Desktop screens.
- **Backend**: **Node.js (Express.js)** REST API with JWT authentication, Supabase cloud database integration, and automated PDF marksheet parsing worker.
- **Database**: **Supabase (PostgreSQL 15)** cloud database storing `profiles`, `import_sessions`, `students`, and `subject_marks`.
- **Location**: `D:\Result Website` (Zero changes made to the original folder).

---

## 📱 Responsive Multi-Device UI (Mobile + Tablet + Desktop)
- **Mobile (< 640px)**: Touch-first UI, off-canvas slide-out navigation drawer, 1-column responsive cards, horizontal swipeable tables, and touch targets >= 44px.
- **Tablet (640px - 1024px)**: 2-column KPI grid, touch-friendly Chart.js analytics, flexible header.
- **Desktop (> 1024px)**: Sleek permanent sidebar, 3 & 4 column KPI grids, side-by-side Chart.js visualizations, ambient glowing gradients, and Command Palette (`Ctrl + K`).

---

## 🚀 Key Modules & Pages
1. **Landing Page**: Modern hero showcase, live metric counters, quick actions.
2. **Authentication**: Sign In, Register, Forgot Password, and 6-digit OTP verification via Gmail SMTP.
3. **Executive Dashboard**: Live KPIs (Registered, Passed, Failed/ATKT, Pass %, Avg SGPA, Colleges), Grade distribution bar chart, Result composition donut chart.
4. **PDF Upload & Ingestion**: Upload multi-page VNSGU PDF gazettes, parse internal/external marks and SGPA, batch insert into Supabase.
5. **Student Lookup**: Search by Seat No, SPID, or Name; detailed 7-subject breakdown modal with WhatsApp and Email sharing.
6. **Toppers & Merit Lists**: Rank computation, Gold/Silver/Bronze badges, stream filtering, celebratory confetti.
7. **Backlogs & Failed Center**: Categorize candidates with ATKTs; 1-click academic probation warning emails to parents.
8. **Subject Health & AI Exam Difficulty**: 7-point subject stats + 0 to 10 AI difficulty index with pedagogical remedial recommendations.
9. **College Comparison**: Inter-institution performance benchmarks.
10. **Certificate & Marksheet Studio**: Custom college branding, watermarks, principal signatures, and uncapped bulk ZIP marksheet export.
11. **Academic Risk Radar**: Critical, moderate, and safe zone candidate risk profiling.
12. **Public Credential QR Portal (`/verify`)**: Live tamper-proof SHA-256 digital certificate verification without login.
13. **Help Desk**: Submit and track support queries with unique tracking IDs.
14. **Reports Center**: Download formatted master Excel (`.xlsx`) and CSV files.

---

## ⚡ 1-Click Launch
Double-click `start-app.bat` inside `D:\Result Website` to start both backend and frontend automatically!

Or run manually:
```bash
# Backend (Port 5050)
cd "D:\Result Website\backend"
npm start

# Frontend (Port 5173)
cd "D:\Result Website\frontend"
npm run dev
```
