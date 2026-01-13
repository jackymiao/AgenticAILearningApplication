import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create a database connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Helper function to normalize user names
export function normalizeUserName(userName) {
  return userName.trim().toLowerCase();
}

// Helper function to normalize project codes
export function normalizeProjectCode(code) {
  return code.trim().toUpperCase();
}

export default pool;
