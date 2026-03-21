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
        is_detected BOOLEAN,
        word_count INTEGER,
        character_count INTEGER,
        token_count INTEGER,
        api_response_id VARCHAR(255),
        result_json JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ ai_detections table created');
    
    console.log('Creating ai_detections_annotations table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_detections_annotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        detection_id UUID NOT NULL REFERENCES ai_detections(id) ON DELETE CASCADE,
        block_text TEXT NOT NULL,
        confidence NUMERIC(5,4) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ ai_detections_annotations table created');
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_project_user 
      ON ai_detections(project_code, user_name_norm)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_is_detected 
      ON ai_detections(is_detected)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_confidence_score 
      ON ai_detections(confidence_score DESC)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_created_is_detected 
      ON ai_detections(created_at DESC, is_detected)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_predicted_class 
      ON ai_detections(predicted_class)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_created_at 
      ON ai_detections(created_at DESC)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_detections_annotations_detection 
      ON ai_detections_annotations(detection_id)
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
