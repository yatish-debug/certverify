import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Set token on every request via interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Also set default header immediately (fixes race conditions)
const savedToken = localStorage.getItem('adminToken');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const loginAdmin = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  // Set token immediately on axios defaults so dashboard calls work right away
  if (response.data.access_token) {
    setAuthToken(response.data.access_token);
  }
  return response.data;
};

export const loginAdminMfa = async (username, otp_code) => {
  const response = await api.post('/auth/login/mfa', { username, otp_code });
  setAuthToken(response.data.access_token);
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get('/auth/profile');
  return response.data;
};

export const setupMfa = async () => {
  const response = await api.get('/auth/mfa/setup');
  return response.data;
};

export const enableMfa = async (secret, otp_code) => {
  const response = await api.post('/auth/mfa/enable', { secret, otp_code });
  return response.data;
};

export const disableMfa = async () => {
  const response = await api.post('/auth/mfa/disable');
  return response.data;
};


export const verifyCertificate = async (certId) => {
  const response = await api.get(`/verify/${certId}`);
  return response.data;
};

export const verifyCertificateByHash = async (fileHash) => {
  const response = await api.get(`/verify/hash/${fileHash}`);
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/system/stats');
  const data = response.data;
  return {
    total_certificates: data.total,
    active_certificates: data.active,
    expired_certificates: data.expired,
    revoked_certificates: data.revoked
  };
};

export const getCertificates = async (search = '') => {
  const response = await api.get('/certificates/', {
    params: { search }
  });
  return response.data;
};

export const createCertificate = async (formData) => {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_URL}/certificates/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { response: { data: errorData } };
  }
  return response.json();
};

export const updateCertificate = async (certId, formData) => {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_URL}/certificates/${certId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { response: { data: errorData } };
  }
  return response.json();
};

export const deleteCertificate = async (certId) => {
  const response = await api.delete(`/certificates/${certId}`);
  return response.data;
};

export const getAuditLogs = async (limit = 50) => {
  const response = await api.get('/audit/', {
    params: { limit }
  });
  return response.data;
};

export default api;
