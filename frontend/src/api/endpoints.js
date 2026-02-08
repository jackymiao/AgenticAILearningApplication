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
  submitReview: (code, userName, essay) => {
    const requestBody = { userName, essay };
    console.log('[API CLIENT] POST /public/projects/' + code + '/reviews');
    console.log('[API CLIENT] Request body:', {
      userName,
      essayLength: essay?.length || 0,
      essayPreview: essay?.substring(0, 100)
    });
    return apiFetch(`/public/projects/${code}/reviews`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },
  submitFinal: (code, userName, essay) => apiFetch(`/public/projects/${code}/submissions/final`, {
    method: 'POST',
    body: JSON.stringify({ userName, essay })
  }),
  getLeaderboard: (code) => apiFetch(`/public/projects/${code}/leaderboard`)
};

// Game endpoints
export const gameApi = {
  initPlayer: (code, userName) => apiFetch(`/game/projects/${code}/player/init`, {
    method: 'POST',
    body: JSON.stringify({ userName })
  }),
  sendHeartbeat: (code, userName, sessionId) => apiFetch(`/game/projects/${code}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ userName, sessionId })
  }),
  getActivePlayers: (code, userName) => apiFetch(`/game/projects/${code}/active-players?userName=${encodeURIComponent(userName)}`),
  attack: (code, attackerName, targetName) => apiFetch(`/game/projects/${code}/attack`, {
    method: 'POST',
    body: JSON.stringify({ attackerName, targetName })
  }),
  defend: (code, attackId, useShield) => apiFetch(`/game/projects/${code}/defend`, {
    method: 'POST',
    body: JSON.stringify({ attackId, useShield })
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
