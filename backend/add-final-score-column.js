import pool from './dist/db/index.js';

async function migrate() {
  try {
    console.log('Adding final_score column to review_attempts table...');
    
    // Add final_score column
    await pool.query(`
      ALTER TABLE review_attempts 
      ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2)
    `);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'review_attempts' 
      AND column_name = 'final_score'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column final_score exists:', result.rows[0]);
    } else {
      console.log('❌ Column was not added');
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();
