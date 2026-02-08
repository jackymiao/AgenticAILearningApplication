import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Delete old review attempts
    const deleteResult = await client.query(
      "DELETE FROM review_attempts WHERE category NOT IN ('content', 'structure', 'mechanics')"
    );
    console.log(`✓ Deleted ${deleteResult.rowCount} old review attempts`);

    // Drop old constraint
    await client.query(
      'ALTER TABLE review_attempts DROP CONSTRAINT IF EXISTS review_attempts_category_check'
    );
    console.log('✓ Dropped old category constraint');

    // Add new constraint
    await client.query(
      "ALTER TABLE review_attempts ADD CONSTRAINT review_attempts_category_check CHECK (category IN ('content', 'structure', 'mechanics'))"
    );
    console.log('✓ Added new category constraint');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
