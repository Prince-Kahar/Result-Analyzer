const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', '🎓 Launching VNSGU Result Intelligence Suite');
console.log('\x1b[36m%s\x1b[0m', '🛡️  Security Mode: Single-File Obfuscated Index.html');
console.log('\x1b[36m%s\x1b[0m', '🚀 Backend (Node.js/Express)  : http://localhost:5050');
console.log('\x1b[36m%s\x1b[0m', '✨ Frontend (Single-File)      : http://localhost:5173');
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Ensure dist/index.html exists
const distHtml = path.join(__dirname, 'frontend', 'dist', 'index.html');
const fs = require('fs');
if (!fs.existsSync(distHtml)) {
  console.log('\x1b[33mBuilding secure single-file production bundle...\x1b[0m');
  try {
    execSync(npmCmd + ' run build', {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('Build failed:', err.message);
  }
}

// 1. Spawn Backend
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe',
  shell: true
});

backend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.log('\x1b[34m[Backend]\x1b[0m ' + line);
  });
});

backend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.error('\x1b[31m[Backend Error]\x1b[0m ' + line);
  });
});

// 2. Spawn Frontend Preview (Serves single-file dist/index.html with NO src files exposed)
const frontend = spawn(npmCmd, ['run', 'preview'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'pipe',
  shell: true
});

frontend.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.log('\x1b[32m[Frontend]\x1b[0m ' + line);
  });
});

frontend.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) console.error('\x1b[33m[Frontend Warn]\x1b[0m ' + line);
  });
});

// Cleanup on exit
function shutdown() {
  console.log('\n\x1b[33mShutting down services...\x1b[0m');
  try {
    if (isWin) {
      if (backend.pid) spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
      if (frontend.pid) spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
    } else {
      backend.kill('SIGINT');
      frontend.kill('SIGINT');
    }
  } catch (_) {}
  process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
