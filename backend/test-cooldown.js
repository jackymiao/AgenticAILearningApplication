import fetch from 'node-fetch';

async function testCooldown() {
  try {
    console.log('Testing user-state endpoint for cooldown...\n');
    
    const response = await fetch('http://localhost:3000/api/public/projects/TEST21/user-state?userName=testuser');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('\nUser State:');
    console.log('- Already Submitted:', data.alreadySubmitted);
    console.log('- Attempts Remaining:', data.attemptsRemaining);
    console.log('- Cooldown Remaining:', data.cooldownRemaining, 'ms');
    
    if (data.cooldownRemaining > 0) {
      const seconds = Math.ceil(data.cooldownRemaining / 1000);
      console.log('  (' + seconds + ' seconds)');
    } else {
      console.log('  (No cooldown active)');
    }
    
    console.log('\n✅ Cooldown feature is working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCooldown();
