// Frontend type definitions

export interface AuthState {
  isAdmin: boolean;
  adminName: string | null;
  isBootstrapping: boolean;
}

export interface AuthContextType {
  auth: AuthState;
  refreshMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, accessCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface AuthContextType {
  auth: AuthState;
  refreshMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, accessCode: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface Project {
  code: string;
  title: string;
  description: string;
  youtube_url: string | null;
  word_limit: number;
  attempt_limit_per_category: number;
}

export interface ProjectFull extends Project {
  agent_mode: 'agent_a' | 'agent_b';
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ReviewCategory = 'grammar' | 'structure' | 'style' | 'content';

export interface ReviewAttempt {
  id: string;
  category: ReviewCategory;
  attempt_number: number;
  status: 'success' | 'error';
  score: number | null;
  result_json: any;
  error_message: string | null;
  created_at: string;
  essay_snapshot?: string;
}

export interface UserState {
  alreadySubmitted: boolean;
  attemptsRemaining: Record<ReviewCategory, number>;
  reviewHistory: Record<ReviewCategory, ReviewAttempt[]>;
}

export interface Submission {
  id: string;
  project_code: string;
  user_name: string;
  user_name_norm: string;
  essay: string;
  submitted_at: string;
  admin_score: number | null;
  admin_feedback: string;
  updated_at: string;
}

export interface SubmissionListItem {
  id: string;
  user_name: string;
  essay_preview: string;
  admin_score: number | null;
  submitted_at: string;
}

export interface SubmissionDetail extends Submission {
  reviewHistory: Record<ReviewCategory, ReviewAttempt[]>;
}

export interface ProjectFormData {
  code?: string;
  title: string;
  description: string;
  youtubeUrl: string;
  wordLimit: number;
  attemptLimitPerCategory: number;
  agentMode: 'agent_a' | 'agent_b';
}
