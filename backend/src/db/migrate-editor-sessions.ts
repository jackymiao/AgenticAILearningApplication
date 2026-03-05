import { pool } from './index.js';

async function migrate() {
  try {
    console.log('Creating editor_sessions table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS editor_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
        user_name_norm TEXT NOT NULL,
        
        -- Session identification
        session_id TEXT NOT NULL,
        
        -- Event tracking
        event_type TEXT NOT NULL CHECK (event_type IN ('focus', 'blur')),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        -- Duration and context
        duration_ms INTEGER,
        essay_length INTEGER,
        current_attempt_number INTEGER,
        
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ editor_sessions table created');
    
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_editor_sessions_lookup 
      ON editor_sessions(project_code, user_name_norm);
      
      CREATE INDEX IF NOT EXISTS idx_editor_sessions_timestamp 
      ON editor_sessions(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_editor_sessions_event 
      ON editor_sessions(event_type);
    `);
    
    console.log('✅ Indexes created');
    console.log('✅ Migration complete');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
