import { apiFetch } from './client.js';
import type {
  AuthState,
  Project,
  ProjectFull,
  UserState,
  ReviewAttempt,
  SubmissionListItem,
  SubmissionDetail,
  ReviewCategory,
  ProjectFormData
} from '../types.js';

// Auth endpoints
export const auth = {
  me: () => apiFetch<AuthState>('/auth/me'),
  login: (username: string, password: string) => apiFetch<AuthState>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  signup: (username: string, password: string, accessCode: string) => apiFetch<AuthState>('/auth/admin/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password, accessCode })
  }),
  logout: () => apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST' })
};

// Public endpoints
export const publicApi = {
  getProject: (code: string) => apiFetch<Project>(`/public/projects/${code}`),
  getUserState: (code: string, userName: string) => apiFetch<UserState>(`/public/projects/${code}/user-state?userName=${encodeURIComponent(userName)}`),
  submitReview: (code: string, userName: string, essay: string, category: ReviewCategory) => 
    apiFetch<{ review: ReviewAttempt; attemptsRemaining: number }>(`/public/projects/${code}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ userName, essay, category })
    }).then(response => {
      console.log('='.repeat(80));
      console.log('RAW API RESPONSE FROM BACKEND:');
      console.log('='.repeat(80));
      console.log('Full response:', response);
      console.log('\nreview object:', response.review);
      console.log('\nresult_json type:', typeof response.review?.result_json);
      console.log('\nresult_json content:', response.review?.result_json);
      console.log('='.repeat(80));
      return response;
    }),
  submitFinal: (code: string, userName: string, essay: string) => 
    apiFetch<{ success: boolean; submissionId: string; submittedAt: string }>(`/public/projects/${code}/submissions/final`, {
      method: 'POST',
      body: JSON.stringify({ userName, essay })
    })
};

// Admin endpoints
export const adminApi = {
  getProjects: () => apiFetch<Array<ProjectFull & { created_by: string }>>('/admin/projects'),
  getProject: (code: string) => apiFetch<ProjectFull>(`/admin/projects/${code}`),
  createProject: (project: ProjectFormData) => apiFetch<ProjectFull>('/admin/projects', {
    method: 'POST',
    body: JSON.stringify(project)
  }),
  updateProject: (code: string, project: Omit<ProjectFormData, 'code'>) => apiFetch<ProjectFull>(`/admin/projects/${code}`, {
    method: 'PUT',
    body: JSON.stringify(project)
  }),
  getSubmissions: (code: string, sort?: string) => apiFetch<SubmissionListItem[]>(`/admin/projects/${code}/submissions?sort=${sort || 'newest'}`),
  getSubmission: (submissionId: string) => apiFetch<SubmissionDetail>(`/admin/submissions/${submissionId}`),
  updateGrading: (submissionId: string, adminScore: number | null, adminFeedback: string) => 
    apiFetch<{ id: string; admin_score: number | null; admin_feedback: string; updated_at: string }>(`/admin/submissions/${submissionId}/grading`, {
      method: 'PATCH',
      body: JSON.stringify({ adminScore, adminFeedback })
    })
};
