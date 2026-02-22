-- Migration script to add missing_category_errors table

CREATE TABLE IF NOT EXISTS missing_category_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_name_norm TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('content', 'structure', 'mechanics')),
  error_message TEXT NOT NULL DEFAULT 'Missing review category',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
