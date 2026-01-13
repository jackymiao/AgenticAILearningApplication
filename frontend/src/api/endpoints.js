import { apiFetch } from './client.js';

// Auth endpoints
export const auth = {
  me: () => apiFetch('/auth/me'),
  login: (username, password) => apiFetch('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  signup: (username, password, accessCode) => apiFetch('/auth/admin/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password, accessCode })
  }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' })
};

// Public endpoints
export const publicApi = {
  getProject: (code) => apiFetch(`/public/projects/${code}`),
  getUserState: (code, userName) => apiFetch(`/public/projects/${code}/user-state?userName=${encodeURIComponent(userName)}`),
  submitReview: (code, userName, essay, category) => apiFetch(`/public/projects/${code}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ userName, essay, category })
  }),
  submitFinal: (code, userName, essay) => apiFetch(`/public/projects/${code}/submissions/final`, {
    method: 'POST',
    body: JSON.stringify({ userName, essay })
  })
};

// Admin endpoints
export const adminApi = {
  getProjects: () => apiFetch('/admin/projects'),
  getProject: (code) => apiFetch(`/admin/projects/${code}`),
  createProject: (project) => apiFetch('/admin/projects', {
    method: 'POST',
    body: JSON.stringify(project)
  }),
  updateProject: (code, project) => apiFetch(`/admin/projects/${code}`, {
    method: 'PUT',
    body: JSON.stringify(project)
  }),
  deleteProjects: (codes) => apiFetch('/admin/projects', {
    method: 'DELETE',
    body: JSON.stringify({ codes })
  }),
  getSubmissions: (code, sort) => apiFetch(`/admin/projects/${code}/submissions?sort=${sort || 'newest'}`),
  getSubmission: (submissionId) => apiFetch(`/admin/submissions/${submissionId}`),
  updateGrading: (submissionId, adminScore, adminFeedback) => apiFetch(`/admin/submissions/${submissionId}/grading`, {
    method: 'PATCH',
    body: JSON.stringify({ adminScore, adminFeedback })
  })
};
