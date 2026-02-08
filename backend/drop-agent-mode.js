import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function dropAgentMode() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Drop the agent_mode column
    await client.query('ALTER TABLE projects DROP COLUMN IF EXISTS agent_mode');
    console.log('✓ Dropped agent_mode column from projects table');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

dropAgentMode();
