-- Create table for AI detection results
CREATE TABLE IF NOT EXISTS ai_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code VARCHAR(50) NOT NULL,
  user_name_norm VARCHAR(255) NOT NULL,
  essay_snippet TEXT,
  predicted_class VARCHAR(50) NOT NULL, -- 'ai', 'human', 'mixed', 'pure_ai', 'paraphrased'
  confidence_score NUMERIC(5,4),
  confidence_category VARCHAR(50), -- 'low', 'medium', 'high'
  overall_burstiness NUMERIC(10,8),
  result_json JSONB, -- Full GPTZero response
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_detections_project_user 
ON ai_detections(project_code, user_name_norm);

CREATE INDEX IF NOT EXISTS idx_ai_detections_predicted_class 
ON ai_detections(predicted_class);

CREATE INDEX IF NOT EXISTS idx_ai_detections_created_at 
ON ai_detections(created_at DESC);
