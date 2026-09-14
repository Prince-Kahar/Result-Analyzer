const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('vnsgu_auth_token');
export const setAuthToken = (token) => localStorage.setItem('vnsgu_auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('vnsgu_auth_token');

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const activeSessionId = localStorage.getItem('vnsgu_active_session');
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeSessionId && activeSessionId !== 'undefined' && activeSessionId !== 'null') {
    headers['X-Session-Id'] = String(activeSessionId);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocal) {
        throw new Error('Network error: You are on localhost. If accessing from mobile, please open the live cloud link: https://student-result-analyzer.antideploy.com');
      } else {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }
    }
    throw err;
  }
};

export const api = {
  // Auth
  login: (creds) => request('/auth/login', { method: 'POST', body: JSON.stringify(creds) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  sendOtp: (email, purpose, username, phone) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, purpose, username, phone }) }),
  checkPhone: (phone) => request('/auth/check-phone?phone=' + encodeURIComponent(phone)),
  checkUsername: (username) => request('/auth/check-username?username=' + encodeURIComponent(username)),
  checkEmail: (email) => request('/auth/check-email?email=' + encodeURIComponent(email)),
  verifyOtp: (email, otp) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  updateProfile: (data) => request('/auth/update-profile', { method: 'POST', body: JSON.stringify(data) }),
  updatePassword: (data) => request('/auth/update-password', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard & Sessions
  getDashboard: (params = '') => request(`/dashboard?${params}`),
  getSessions: () => request('/dashboard/sessions'),
  deleteSession: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),

  // Students & Lookup
  getStudents: (params = '') => request(`/students?${params}`),
  getStudentReport: (id) => request(`/students/${id}/report`),
  getToppers: (params = '') => request(`/students/top-n?${params}`),
  getFailedStudents: (params = '') => request(`/students/failed?${params}`),
  sendParentWarning: (email, student) => request('/students/send-warning', { method: 'POST', body: JSON.stringify({ email, student }) }),
  getContacts: (params = '') => request(`/students/contacts?${params}`),

  // Subjects & Analytics
  getSubjects: (params = '') => request(`/subjects?${params}`),
  getExamDifficulty: (params = '') => request(`/subjects/exam-difficulty?${params}`),
  getRiskRadar: (params = '') => request(`/risk-radar/analytics?${params}`),

  // Colleges
  getColleges: (params = '') => request(`/colleges?${params}`),
  getCollegesStats: (params = '') => request(`/colleges/stats?${params}`),

  // Upload - Robust Mobile & Desktop Upload with Progress tracking via XHR
  uploadPdf: async (file, onProgress) => {
    // Helper to convert ArrayBuffer to Base64
    const bufferToBase64 = (buffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    const token = getAuthToken();
    const activeSessionId = localStorage.getItem('vnsgu_active_session');

    // 1. Verify and read file into memory (guards against revoked mobile storage URIs)
    let fileBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
      if (!fileBuffer || fileBuffer.byteLength === 0) {
        throw new Error('Selected file is empty (0 bytes). Please choose the file again from your Downloads folder.');
      }
    } catch (readErr) {
      throw new Error('Could not access selected file on device: ' + readErr.message);
    }

    // LAYER 1: Standard Multipart Form-Data with XHR Progress
    const tryMultipartXHR = () => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        formData.append('file', blob, file.name || 'Examination_Gazette.pdf');

        xhr.open('POST', `${API_BASE}/upload`, true);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        if (activeSessionId && activeSessionId !== 'undefined' && activeSessionId !== 'null') {
          xhr.setRequestHeader('X-Session-Id', String(activeSessionId));
        }

        xhr.timeout = 180000;

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent, event.loaded, event.total);
            }
          };
        }

        xhr.onload = () => {
          let data = {};
          try { data = JSON.parse(xhr.responseText || '{}'); } catch (e) { data = {}; }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.message || `Upload status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('NETWORK_ERROR'));
        };

        xhr.ontimeout = () => {
          reject(new Error('TIMEOUT'));
        };

        xhr.send(formData);
      });
    };

    // LAYER 2: Raw Binary Direct Upload (Bypasses multipart headers completely)
    const tryRawBinary = async () => {
      const headers = {
        'Content-Type': 'application/pdf',
        'X-Filename': encodeURIComponent(file.name || 'Examination.pdf')
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (activeSessionId && activeSessionId !== 'undefined' && activeSessionId !== 'null') {
        headers['X-Session-Id'] = String(activeSessionId);
      }

      const res = await fetch(`${API_BASE}/upload/raw`, {
        method: 'POST',
        headers,
        body: fileBuffer
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Raw upload status ${res.status}`);
      }
      return data;
    };

    // LAYER 3: Base64 JSON Upload (Guaranteed fallback for restricted mobile webviews)
    const tryBase64 = async () => {
      const base64 = bufferToBase64(fileBuffer);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (activeSessionId && activeSessionId !== 'undefined' && activeSessionId !== 'null') {
        headers['X-Session-Id'] = String(activeSessionId);
      }

      const res = await fetch(`${API_BASE}/upload/base64`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: file.name || 'Examination.pdf',
          base64: 'data:application/pdf;base64,' + base64
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Base64 upload status ${res.status}`);
      }
      return data;
    };

    // Execute tiered fallback
    try {
      return await tryMultipartXHR();
    } catch (err1) {
      console.warn('Multipart upload failed, attempting raw binary fallback:', err1.message);
      if (onProgress) onProgress(50, fileBuffer.byteLength / 2, fileBuffer.byteLength);

      try {
        return await tryRawBinary();
      } catch (err2) {
        console.warn('Raw binary upload failed, attempting Base64 fallback:', err2.message);
        if (onProgress) onProgress(80, fileBuffer.byteLength, fileBuffer.byteLength);

        try {
          return await tryBase64();
        } catch (err3) {
          console.error('All 3 upload mechanisms failed:', err3);
          const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.') || window.location.hostname.startsWith('10.'));
          if (isLocal) {
            throw new Error('Network error: You are on local IP. On mobile, please use the live cloud address: https://student-result-analyzer.antideploy.com');
          }
          throw new Error('Upload failed across all transmission modes. Error: ' + err3.message);
        }
      }
    }
  },

  clearSessions: () => request('/upload/clear-sessions', { method: 'POST' }),

  // Branding & Certificates
  getBranding: () => request('/branding/certificate'),
  updateBranding: (data) => request('/branding/certificate', { method: 'POST', body: JSON.stringify(data) }),

  // Public Verification (No Auth Needed)
  verifyStudent: (id) => fetch(`/api/verify/student/${id}`).then(r => r.json()),

  // Help Desk
  submitTicket: (data) => request('/help-desk', { method: 'POST', body: JSON.stringify(data) }),
  trackTicket: (trackId) => request(`/help-desk/track?tracking_id=${trackId}`),
  getTickets: () => request('/help-desk'),
  replyTicket: (data) => request('/help-desk/reply', { method: 'POST', body: JSON.stringify(data) }),

  // Admin Panel Management
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  updateUserRole: (id, role) => request('/admin/users/' + id + '/role', { method: 'POST', body: JSON.stringify({ role }) }),
  deleteAdminUser: (id) => request('/admin/users/' + id, { method: 'DELETE' }),
  adminResetPassword: (id, new_password) => request('/admin/users/' + id + '/reset-password', { method: 'POST', body: JSON.stringify({ new_password }) }),
  getAdminSessions: () => request('/admin/sessions'),
  deleteAdminSession: (id) => request('/admin/sessions/' + id, { method: 'DELETE' }),
  testAdminSmtp: (email) => request('/admin/test-smtp', { method: 'POST', body: JSON.stringify({ email }) }),
  rehashLegacyPasswords: () => request('/admin/rehash-legacy-passwords', { method: 'POST' })
};
