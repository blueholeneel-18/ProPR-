import axios from 'axios';

const baseURL = import.meta.env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('propr_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error || error.message || 'Unexpected request error';
    return Promise.reject(new Error(message));
  }
);

export const bugService = {
  list: (params) => api.get('/bugs', { params }).then((res) => res.data.data),
  get: (id) => api.get(`/bugs/${id}`).then((res) => res.data.data),
  create: (payload) => api.post('/bugs', payload).then((res) => res.data.data),
  update: (id, payload) => api.patch(`/bugs/${id}`, payload).then((res) => res.data.data),
  assign: (id, assignedTo) =>
    api.patch(`/bugs/${id}/assign`, { assigned_to: assignedTo }).then((res) => res.data.data),
  remove: (id) => api.delete(`/bugs/${id}`),
  comments: (id) => api.get(`/bugs/${id}/comments`).then((res) => res.data.data),
  addComment: (id, message) =>
    api.post(`/bugs/${id}/comments`, { message }).then((res) => res.data.data),
};

export const userService = {
  list: () => api.get('/users').then((res) => res.data.data),
  me: () => api.get('/users/me').then((res) => res.data.data),
};

export const healthService = {
  check: () => api.get('/health').then((res) => res.data),
};

export default api;
