import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a database connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected database error:', err);
});

// Helper function to normalize user names
export function normalizeUserName(userName: string): string {
  return userName.trim().toLowerCase();
}

// Helper function to normalize project codes
export function normalizeProjectCode(code: string): string {
  return code.trim().toUpperCase();
}

export default pool;
