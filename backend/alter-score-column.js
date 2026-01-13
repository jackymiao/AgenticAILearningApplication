import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function alterColumn() {
  try {
    console.log('Connecting to database...');
    const result = await pool.query('ALTER TABLE review_attempts ALTER COLUMN score TYPE NUMERIC(5,2);');
    console.log('✅ Successfully altered score column to NUMERIC(5,2)');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error altering column:', error);
  } finally {
    await pool.end();
  }
}

alterColumn();
