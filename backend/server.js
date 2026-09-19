import app from './app.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5050;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`🎓 VNSGU Result Analyzer Backend Server Running`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`📡 Supabase: Connected to ${process.env.SUPABASE_URL}`);
  console.log(`⚡ Status: Fully Operational at http://127.0.0.1:${PORT}`);
  console.log(`==================================================`);
});
