import bcrypt from 'bcrypt';
import pool from '../db/index.js';
import type { Admin } from '../types.js';

const SALT_ROUNDS = 10;

export async function createAdmin(username: string, password: string): Promise<Admin> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await pool.query<Admin>(
    `INSERT INTO admin_users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username, created_at`,
    [username, passwordHash]
  );
  
  return result.rows[0];
}

export async function verifyAdmin(username: string, password: string): Promise<Omit<Admin, 'password_hash' | 'created_at'> | null> {
  const result = await pool.query<Admin>(
    `SELECT id, username, password_hash FROM admin_users WHERE username = $1`,
    [username]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const admin = result.rows[0];
  const isValid = await bcrypt.compare(password, admin.password_hash!);
  
  if (!isValid) {
    return null;
  }
  
  return {
    id: admin.id,
    username: admin.username
  };
}

export async function getAdminById(id: string): Promise<Omit<Admin, 'password_hash' | 'created_at'> | null> {
  const result = await pool.query<Admin>(
    `SELECT id, username FROM admin_users WHERE id = $1`,
    [id]
  );
  
  return result.rows[0] || null;
}
