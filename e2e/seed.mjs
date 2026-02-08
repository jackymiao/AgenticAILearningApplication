import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const { Pool } = pg;

// Use TEST database if available, otherwise regular database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
});

const TEST_PROJECT_CODE = 'ABC123';
const TEST_PROJECT_TITLE = 'E2E Token Game Project';
const TEST_YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TEST_DESCRIPTION = 'E2E Test Project for Token Game';
const TEST_ESSAY_CONTENT = `# My Test Essay

This is a comprehensive test essay that demonstrates the token game mechanics.

## Introduction

The essay begins with a clear introduction to the topic. We will explore various aspects of the subject matter in depth.

## Body Paragraphs

### First Point

This paragraph develops the first main idea with supporting evidence and examples. The argumentation is logical and well-structured.

### Second Point

Here we present another perspective, building upon the foundation laid in the previous section. The transitions are smooth and maintain coherence.

### Third Point

The final body paragraph synthesizes the previous arguments and introduces concluding thoughts that will be expanded in the conclusion.

## Conclusion

In conclusion, this essay has demonstrated a thorough understanding of the topic through careful analysis and well-reasoned arguments. The structure is clear, the content is substantive, and the mechanics are sound.

This essay is intentionally over 200 words to meet the minimum word count requirement for testing purposes.`;

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('\n🌱 Starting E2E Test Database Seeding...\n');
    
    await client.query('BEGIN');
    
    // 1. Create or update test project
    console.log('📁 Creating test project:', TEST_PROJECT_CODE);
    const projectResult = await client.query(
      `INSERT INTO projects (code, title, youtube_url, description, attempt_limit_per_category, word_limit)
       VALUES ($1, $2, $3, $4, 10, 100)
       ON CONFLICT (code) 
       DO UPDATE SET 
         title = EXCLUDED.title,
         youtube_url = EXCLUDED.youtube_url,
         description = EXCLUDED.description
       RETURNING code, title`,
      [TEST_PROJECT_CODE, TEST_PROJECT_TITLE, TEST_YOUTUBE_URL, TEST_DESCRIPTION]
    );
    
    const project = projectResult.rows[0];
    console.log(`✅ Project created/updated: Code=${project.code}`);
    
    // 2. Create test users (just initialize player_state - no users table)
    const testUsers = [
      { userName: 'demoUser1', reviewTokens: 3, attackTokens: 0, shieldTokens: 1 },
      { userName: 'demoUser2', reviewTokens: 3, attackTokens: 0, shieldTokens: 1 }
    ];
    
    console.log('\n👥 Creating test users and player states...');
    for (const user of testUsers) {
      await client.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens, created_at, updated_at)
         VALUES ($1, $2, LOWER(TRIM($2)), $3, $4, $5, NOW(), NOW())
         ON CONFLICT (project_code, user_name_norm)
         DO UPDATE SET
           review_tokens = EXCLUDED.review_tokens,
           attack_tokens = EXCLUDED.attack_tokens,
           shield_tokens = EXCLUDED.shield_tokens,
           last_review_at = NULL,
           updated_at = NOW()`,
        [TEST_PROJECT_CODE, user.userName, user.reviewTokens, user.attackTokens, user.shieldTokens]
      );
      console.log(`✅ Player state created: ${user.userName} - ${user.reviewTokens} review, ${user.attackTokens} attack, ${user.shieldTokens} shield`);
    }
    
    // 3. Clear any existing test data
    console.log('\n🧹 Cleaning up old test data...');
    await client.query(`DELETE FROM attacks WHERE project_code = $1`, [TEST_PROJECT_CODE]);
    await client.query(`DELETE FROM review_attempts WHERE project_code = $1`, [TEST_PROJECT_CODE]);
    await client.query(`DELETE FROM submissions WHERE project_code = $1`, [TEST_PROJECT_CODE]);
    await client.query(`DELETE FROM active_sessions WHERE project_code = $1`, [TEST_PROJECT_CODE]);
    console.log('✅ Old test data cleaned');
    
    await client.query('COMMIT');
    
    console.log('\n✨ Seed completed successfully!\n');
    console.log('📊 Test Configuration:');
    console.log(`   Project Code: ${TEST_PROJECT_CODE}`);
    console.log(`   Test URL: http://localhost:5174/projects/${TEST_PROJECT_CODE}`);
    console.log(`   Users: demoUser1, demoUser2`);
    console.log(`   Initial Tokens: 3 review, 0 attack, 1 shield each\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed
seed().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
