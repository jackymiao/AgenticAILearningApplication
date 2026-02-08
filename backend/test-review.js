import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3000';
const PROJECT_CODE = 'ABC123'; // Use your actual project code
const USER_NAME = 'TestUser';
const ESSAY = `I didn't start with a grand vision. I started with curiosity—and the courage to follow it consistently.

I've moved across countries, switched fields, and rebuilt myself more than once. Each transition forced me to learn fast, adapt faster, and stay calm in uncertainty. Over time, I realized this wasn't chaos; it was my edge. I'm someone who turns ambiguity into structure and ideas into systems.

Today, I build at the intersection of technology, creativity, and strategy. Whether I'm designing a product, telling a story, or solving a problem, my focus is the same: clarity, intention, and impact. I don't chase trends—I translate complexity into something people can actually use.

My brand isn't about being perfect. It's about being intentional, resilient, and relentlessly curious. I'm still evolving, but one thing is constant: I create value by connecting dots others overlook—and I do it with purpose.`;

async function testReview() {
  console.log('🚀 Starting review test...\n');
  console.log('Project Code:', PROJECT_CODE);
  console.log('User Name:', USER_NAME);
  console.log('Essay length:', ESSAY.length, 'characters');
  console.log('Word count:', ESSAY.split(/\s+/).length, 'words');
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    console.log('📤 Sending POST request to:', `${BACKEND_URL}/api/public/projects/${PROJECT_CODE}/reviews`);
    console.log('Request body:', {
      userName: USER_NAME,
      essay: ESSAY.substring(0, 100) + '...' // Show first 100 chars
    });
    console.log('\n' + '-'.repeat(80) + '\n');

    const startTime = Date.now();
    
    const response = await fetch(`${BACKEND_URL}/api/public/projects/${PROJECT_CODE}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: USER_NAME,
        essay: ESSAY
      })
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Request completed in ${duration}s`);
    console.log('Response status:', response.status, response.statusText);
    console.log('\n' + '-'.repeat(80) + '\n');

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error response:');
      console.error(JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Success! Response data:');
    console.log('\n📊 RESPONSE STRUCTURE:');
    console.log('- reviews: array of', data.reviews?.length || 0, 'items');
    console.log('- finalScore:', data.finalScore);
    console.log('- attemptsRemaining:', data.attemptsRemaining);
    
    console.log('\n' + '='.repeat(80));
    console.log('FULL RESPONSE DATA:');
    console.log('='.repeat(80) + '\n');
    console.log(JSON.stringify(data, null, 2));

    if (data.reviews && Array.isArray(data.reviews)) {
      console.log('\n' + '='.repeat(80));
      console.log('REVIEW DETAILS BY CATEGORY:');
      console.log('='.repeat(80) + '\n');
      
      data.reviews.forEach((review, index) => {
        console.log(`\n📝 Review ${index + 1} - ${review.category?.toUpperCase()}`);
        console.log('-'.repeat(40));
        console.log('ID:', review.id);
        console.log('Attempt Number:', review.attempt_number);
        console.log('Status:', review.status);
        console.log('Score:', review.score);
        console.log('Created At:', review.created_at);
        
        if (review.result_json) {
          console.log('\nResult JSON:');
          console.log(JSON.stringify(review.result_json, null, 2));
        }
        
        if (review.error_message) {
          console.log('\n⚠️  Error Message:', review.error_message);
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testReview();
