import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const parsePdfWithWorker = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const workerScript = path.join(__dirname, 'parser_worker.py');
    const pyCmd = process.platform === 'win32' ? 'python' : (process.env.PYTHON_BIN || 'python3');
    const pyProcess = spawn(pyCmd, [workerScript, pdfPath]);

    let outputData = '';
    let errorData = '';

    pyProcess.stdout.on('data', (chunk) => {
      outputData += chunk.toString('utf8');
    });

    pyProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString('utf8');
    });

    pyProcess.on('close', (code) => {
      if (code !== 0 && !outputData) {
        return reject(new Error(`PDF parser exited with code ${code}: ${errorData}`));
      }
      try {
        const parsed = JSON.parse(outputData.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse parser output: ${outputData || errorData}`));
      }
    });
  });
};
