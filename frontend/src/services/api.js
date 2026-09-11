const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('vnsgu_auth_token');
export const setAuthToken = (token) => localStorage.setItem('vnsgu_auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('vnsgu_auth_token');

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `HTTP error! status: ${res.status}`);
  }
  return data;
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
  getSessions: () => request('/sessions'),
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

  // Upload
  uploadPdf: (formData) => request('/upload', { method: 'POST', body: formData }),
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
