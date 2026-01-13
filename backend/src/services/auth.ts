import bcrypt from 'bcrypt';
import pool from '../db/index.js';
import type { Admin } from '../types.js';

const SALT_ROUNDS = 10;

export async function createAdmin(username: string, password: string, isSuperAdmin: boolean = false): Promise<Admin> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const result = await pool.query<Admin>(
    `INSERT INTO admin_users (username, password_hash, is_super_admin)
     VALUES ($1, $2, $3)
     RETURNING id, username, is_super_admin, created_at`,
    [username, passwordHash, isSuperAdmin]
  );
  
  return result.rows[0];
}

export async function verifyAdmin(username: string, password: string): Promise<Omit<Admin, 'password_hash' | 'created_at'> | null> {
  const result = await pool.query<Admin>(
    `SELECT id, username, password_hash, is_super_admin FROM admin_users WHERE username = $1`,
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
    username: admin.username,
    is_super_admin: admin.is_super_admin
  };
}

export async function getAdminById(id: string): Promise<Omit<Admin, 'password_hash' | 'created_at'> | null> {
  const result = await pool.query<Admin>(
    `SELECT id, username, is_super_admin FROM admin_users WHERE id = $1`,
    [id]
  );
  
  return result.rows[0] || null;
}
