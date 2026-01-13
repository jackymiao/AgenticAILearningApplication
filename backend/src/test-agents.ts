import dotenv from 'dotenv';
dotenv.config();

import { callAgentA } from './services/sdks/agentA.js';
import { callGrammarAgent } from './services/sdks/grammar.js';
import { callStructureAgent } from './services/sdks/structure.js';
import { callStyleAgent } from './services/sdks/style.js';
import { callContentAgent } from './services/sdks/content.js';

// Fake data for testing
const testData = {
  userName: 'TestStudent',
  essay: 'This is a test essay. It has some sentences to evaluate. The purpose is to test the agent SDK integration. We want to see what kind of response we get from the agents.',
  category: 'grammar',
  attemptNumber: 1,
  previousAttempts: [] as any[], // Empty for first attempt
};

// Test data with previous attempts (for 2nd attempt)
const testDataWithPrevious = {
  userName: 'TestStudent',
  essay: 'This is a revised test essay. It has better sentences to evaluate. The purpose is to test the agent SDK integration with previous attempts. We want to see what kind of response we get from the agents.',
  category: 'grammar',
  attemptNumber: 2,
  previousAttempts: [
    {
      attempt_number: 1,
      essay_text: 'This is a test essay. It has some sentences to evaluate.',
      result_json: JSON.stringify({
        result: {
          score: 75,
          grammar_score: 75,
          overview: 'Initial attempt shows basic understanding.',
          breakdown: { spelling: 80, punctuation: 70 },
          suggestions: ['Check verb tenses', 'Review comma usage']
        }
      }),
      submitted_at: new Date('2024-01-01')
    }
  ]
};

async function testAgents() {
  console.log('='.repeat(80));
  console.log('TESTING AGENT SDKs');
  console.log('='.repeat(80));

  // Test Agent A with only grammar category for detailed debugging
  console.log('\n' + '-'.repeat(80));
  console.log('Testing Agent A - Category: GRAMMAR (Detailed)');
  console.log('-'.repeat(80));
  
  try {
    console.log('\nInput Data:');
    console.log('- userName:', testData.userName);
    console.log('- attemptNumber:', testData.attemptNumber);
    console.log('- category:', 'grammar');
    console.log('- essay:', testData.essay);
    console.log('- previousAttempts:', testData.previousAttempts);
    
    const result = await callAgentA(
      testData.userName,
      testData.essay,
      'grammar',
      testData.attemptNumber,
      undefined,
      undefined,
      testData.previousAttempts
    );
    
    console.log('\n✅ SUCCESS - Result:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.status === 'success' && result.result_json) {
      console.log('\n📊 Score extracted:', result.score);
      console.log('📋 Overview:', result.result_json.overview);
    }
  } catch (error: any) {
    console.log('\n❌ ERROR:');
    console.log(error.message);
    console.log(error.stack);
  }

  // Skip other tests for now to focus on the main issue
  console.log('\n' + '='.repeat(80));
  console.log('Tests completed. Check the output above for details.');
  console.log('='.repeat(80));

  console.log('\n' + '='.repeat(80));
  console.log('ALL TESTS COMPLETED');
  console.log('='.repeat(80));
}

// Run tests
testAgents().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
