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
  sendOtp: (email, purpose) => request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, purpose }) }),
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
  uploadPdf: (formData, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = getAuthToken();
      const activeSessionId = localStorage.getItem('vnsgu_active_session');

      xhr.open('POST', `${API_BASE}/upload`, true);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      if (activeSessionId && activeSessionId !== 'undefined' && activeSessionId !== 'null') {
        xhr.setRequestHeader('X-Session-Id', String(activeSessionId));
      }

      xhr.timeout = 180000; // 3 min timeout

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
        try {
          data = JSON.parse(xhr.responseText || '{}');
        } catch (e) {
          data = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          const errMsg = data.message || `Upload failed with server status ${xhr.status}`;
          reject(new Error(errMsg));
        }
      };

      xhr.onerror = () => {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocal) {
          reject(new Error('Network error: You are accessing localhost from mobile. Please use the live cloud URL: https://student-result-analyzer.antideploy.com'));
        } else {
          reject(new Error('Network connection failed. Please check your mobile internet connection and try again.'));
        }
      };

      xhr.ontimeout = () => {
        reject(new Error('Upload request timed out after 3 minutes. The server is still processing your PDF, please check the dashboard.'));
      };

      xhr.send(formData);
    });
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
  replyTicket: (data) => request('/help-desk/reply', { method: 'POST', body: JSON.stringify(data) })
};
