import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('📦 Running project feedback migration...');
    
    const migrationPath = path.join(__dirname, 'add-project-feedback.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migration);
    
    console.log('✅ Migration completed successfully');
    
    // Verify the column was added
    const columnResult = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'enable_feedback'
    `);
    
    if (columnResult.rows.length > 0) {
      console.log('✅ enable_feedback column verified:', columnResult.rows[0]);
    }
    
    // Verify table was created
    const tableResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'project_feedback'
      ORDER BY ordinal_position
    `);
    
    if (tableResult.rows.length > 0) {
      console.log('✅ project_feedback table created with columns:');
      tableResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
