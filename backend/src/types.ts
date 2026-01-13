// Type definitions for the application

export interface Admin {
  id: string;
  username: string;
  password_hash?: string;
  is_super_admin?: boolean;
  created_at: Date;
}

export interface Project {
  code: string;
  title: string;
  description: string;
  youtube_url: string | null;
  word_limit: number;
  attempt_limit_per_category: number;
  agent_mode: 'agent_a' | 'agent_b';
  created_by_admin_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Submission {
  id: string;
  project_code: string;
  user_name: string;
  user_name_norm: string;
  essay: string;
  submitted_at: Date;
  admin_score: number | null;
  admin_feedback: string;
  updated_at: Date;
}

export type ReviewCategory = 'grammar' | 'structure' | 'style' | 'content';
export type ReviewStatus = 'success' | 'error';

export interface ReviewAttempt {
  id: string;
  project_code: string;
  user_name: string;
  user_name_norm: string;
  category: ReviewCategory;
  attempt_number: number;
  essay_snapshot: string;
  status: ReviewStatus;
  score: number | null;
  result_json: any;
  error_message: string | null;
  created_at: Date;
  submission_id: string | null;
}

export interface UserState {
  alreadySubmitted: boolean;
  attemptsRemaining: Record<ReviewCategory, number>;
  reviewHistory: Record<ReviewCategory, ReviewAttempt[]>;
}

export interface AgentCallParams {
  userName: string;
  essay: string;
  category: ReviewCategory;
  attemptNumber: number;
  projectCode: string;
  wordLimit?: number;
  previousAttempts?: ReviewAttempt[];
}

export interface AgentCallResult {
  status: ReviewStatus;
  result_json?: any;
  score?: number | null;
  error_message?: string;
}

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    adminId: string;
    adminUsername: string;
  }
}
