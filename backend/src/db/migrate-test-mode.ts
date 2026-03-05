import { pool } from './index.js';

async function migrate() {
  try {
    console.log('Adding test_mode column to projects table...');
    
    await pool.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    
    console.log('✅ test_mode column added to projects table');
    console.log('✅ Migration complete');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
