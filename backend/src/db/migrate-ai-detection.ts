import pool from './index.js';

async function migrateAIDetections() {
  try {
    console.log('Creating ai_detections table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_detections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_code VARCHAR(50) NOT NULL,
        user_name_norm VARCHAR(255) NOT NULL,
        essay_snippet TEXT,
        predicted_class VARCHAR(50) NOT NULL,
        confidence_score NUMERIC(5,4),
        confidence_category VARCHAR(50),
        overall_burstiness NUMERIC(10,8),
        result_json JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ ai_detections table created');
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_project_user 
      ON ai_detections(project_code, user_name_norm)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_predicted_class 
      ON ai_detections(predicted_class)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_created_at 
      ON ai_detections(created_at DESC)
    `);
    
    console.log('✅ Indexes created');
    console.log('✅ Migration complete');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateAIDetections();
