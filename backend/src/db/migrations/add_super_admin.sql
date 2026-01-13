-- Migration: Add is_super_admin column to admin_users table
-- Date: 2024
-- Description: Adds role-based permissions to distinguish between regular admins and super admins

ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Optionally, create an index if we expect to query by role frequently
CREATE INDEX IF NOT EXISTS idx_admin_users_is_super_admin ON admin_users(is_super_admin);
