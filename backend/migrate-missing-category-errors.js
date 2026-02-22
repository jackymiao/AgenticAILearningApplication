// Migration script for missing_category_errors table
const { Client } = require('pg');
const fs = require('fs');

const MIGRATION_FILE = 'backend/src/db/migrate-missing-category-errors.sql';
const connectionString = process.env.DATABASE_URL;

async function migrate() {
  if (!connectionString) {
    console.error('DATABASE_URL environment variable not set.');
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
