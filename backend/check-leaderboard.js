import pool from './dist/db/index.js';

async function checkData() {
  try {
    // Check review_attempts table
    const result = await pool.query(`
      SELECT user_name, final_score, category, created_at 
      FROM review_attempts 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log('Recent review attempts:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check if final_score column exists and has data
    const countResult = await pool.query(`
      SELECT COUNT(*) as total, 
             COUNT(final_score) as with_score,
             COUNT(DISTINCT user_name) as unique_users
      FROM review_attempts
    `);
    console.log('\nStats:');
    console.log(JSON.stringify(countResult.rows[0], null, 2));
    
    // Test the exact leaderboard query
    const leaderboardResult = await pool.query(`
      SELECT user_name, MAX(final_score) as highest_score
      FROM review_attempts
      WHERE final_score IS NOT NULL
      GROUP BY user_name
      ORDER BY highest_score DESC
      LIMIT 5
    `);
    console.log('\nLeaderboard query result:');
    console.log(JSON.stringify(leaderboardResult.rows, null, 2));
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkData();
