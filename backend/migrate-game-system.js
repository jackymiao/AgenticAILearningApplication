import pool from './dist/db/index.js';

async function migrate() {
  try {
    console.log('Creating game system tables...');
    
    // Create player_state table to track tokens and cooldowns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        user_name_norm TEXT NOT NULL,
        review_tokens INTEGER NOT NULL DEFAULT 3,
        attack_tokens INTEGER NOT NULL DEFAULT 0,
        shield_tokens INTEGER NOT NULL DEFAULT 1,
        last_review_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT unique_player_state UNIQUE (project_code, user_name_norm)
      )
    `);
    console.log('✅ player_state table created');
    
    // Create active_sessions table to track who's online
    await pool.query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        user_name_norm TEXT NOT NULL,
        session_id TEXT NOT NULL UNIQUE,
        last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT unique_active_session UNIQUE (project_code, user_name_norm)
      )
    `);
    console.log('✅ active_sessions table created');
    
    // Create attacks table to track attack history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
        attacker_name TEXT NOT NULL,
        attacker_name_norm TEXT NOT NULL,
        target_name TEXT NOT NULL,
        target_name_norm TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'defended', 'succeeded', 'expired')),
        shield_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        
        CONSTRAINT unique_attack_pair UNIQUE (project_code, attacker_name_norm, target_name_norm)
      )
    `);
    console.log('✅ attacks table created');
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_player_state_lookup ON player_state(project_code, user_name_norm);
      CREATE INDEX IF NOT EXISTS idx_active_sessions_lookup ON active_sessions(project_code);
      CREATE INDEX IF NOT EXISTS idx_active_sessions_last_seen ON active_sessions(last_seen);
      CREATE INDEX IF NOT EXISTS idx_attacks_target ON attacks(project_code, target_name_norm, status);
      CREATE INDEX IF NOT EXISTS idx_attacks_pending ON attacks(status, expires_at);
    `);
    console.log('✅ Indexes created');
    
    console.log('\n🎮 Game system migration completed successfully!');
    
    await pool.end();
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();
