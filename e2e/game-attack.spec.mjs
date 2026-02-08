import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';
const PROJECT_CODE = 'ABC123';
const HEADLESS = process.env.HEADLESS !== 'false';
const SCREENSHOT_DIR = join(__dirname, 'screenshots');

const TEST_USERS = {
  userA: 'demoUser1',
  userB: 'demoUser2'
};

// Helper to wait/sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TEST_ESSAY = `Innovation drives progress across all sectors of society. Through creative thinking and problem-solving, we develop new solutions to longstanding challenges. Technological innovation has transformed communication, enabling instant global connectivity. Healthcare innovations extend lifespans and improve quality of life. Educational innovations make learning accessible to millions worldwide. Environmental innovations address climate change through renewable energy and sustainable practices. Social innovations tackle inequality and promote justice. The innovation process requires identifying problems, developing solutions, testing prototypes, and iterating based on feedback. Collaboration among diverse teams enhances creativity and overcomes individual limitations. Risk-taking is essential, as failures provide valuable learning opportunities. Organizations that foster innovation cultures attract talent and maintain competitive advantages. Governments support innovation through research funding and favorable policies. As we face complex global challenges, innovation remains our most powerful tool for creating a better future. By embracing change and thinking creatively, humanity can solve problems once thought impossible and build a more prosperous, equitable, and sustainable world.`;

// Test scenarios
const scenarios = [];
let browser;

async function setup() {
  console.log('\n🚀 Starting E2E Tests...\n');
  
  // Create screenshot directory
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  
  // Launch browser
  browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  console.log(`✅ Browser launched (headless: ${HEADLESS})`);
}

async function cleanup() {
  if (browser) {
    await browser.close();
    console.log('✅ Browser closed');
  }
}

async function saveScreenshot(page, name, description) {
  const filename = `${scenarios.length + 1}-${name}.png`;
  const path = join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path, fullPage: true });
  scenarios.push({ filename, description, timestamp: new Date().toISOString() });
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function setSession(page, userName) {
  // First navigate to frontend to set domain context
  await page.goto(FRONTEND_URL);
  
  // Call backend API from Node.js context to set session
  const response = await fetch(`${BACKEND_URL}/api/test/set-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, projectCode: PROJECT_CODE })
  });
  
  const data = await response.json();
  
  // Get the actual cookie value from Set-Cookie header (includes s: prefix and signature)
  const setCookieHeader = response.headers.get('set-cookie');
  let cookieValue = data.sessionId;
  
  if (setCookieHeader) {
    // Extract the actual cookie value from Set-Cookie header
    const match = setCookieHeader.match(/connect\.sid=([^;]+)/);
    if (match) {
      cookieValue = decodeURIComponent(match[1]);
    }
  }
  
  // Set the session cookie in browser
  await page.setCookie({
    name: 'connect.sid',
    value: cookieValue,
    domain: 'localhost',
    path: '/',
    httpOnly: true
  });
  
  console.log(`✅ Session set for ${userName}: ${data.sessionId}`);
  return data;
}

async function setupPage(userName) {
  const page = await browser.newPage();
  
  // Auto-accept all dialogs (confirm/alert)
  page.on('dialog', async dialog => {
    console.log(`  [Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });
  
  await setSession(page, userName);
  return page;
}

async function submitNameAndWaitForTokens(page, userName) {
  console.log(`  📝 Submitting name: ${userName}`);
  
  // Wait for name input field and fill it
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.type('input[type="text"]', userName);
  await sleep(300);
  
  // Try multiple button selectors
  let buttonClicked = false;
  try {
    await page.click('button.primary');
    buttonClicked = true;
    console.log('  ✅ Clicked button.primary');
  } catch (e) {
    console.log('  ⚠️ button.primary not found, trying alternatives...');
    try {
      await page.click('button');
      buttonClicked = true;
      console.log('  ✅ Clicked generic button');
    } catch (e2) {
      console.log('  ❌ No button found');
    }
  }
  
  if (!buttonClicked) {
    throw new Error('Could not find Continue button');
  }
  
  // Wait for page to load user state and show tokens
  console.log('  ⏳ Waiting for token display...');
  await page.waitForSelector('[data-testid="my-review-tokens"]', { visible: true, timeout: 20000 });
  console.log('  ✅ Token display found');
  await sleep(1000); // Extra time for state to stabilize
}

async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (e) {
    console.warn(`⚠️  Element not found: ${selector}`);
    return false;
  }
}

async function getTokenCounts(page) {
  return await page.evaluate(() => {
    const review = document.querySelector('[data-testid="my-review-tokens"]')?.textContent;
    const attack = document.querySelector('[data-testid="my-attack-tokens"]')?.textContent;
    const shield = document.querySelector('[data-testid="my-shield-tokens"]')?.textContent;
    return {
      review: parseInt(review || '0'),
      attack: parseInt(attack || '0'),
      shield: parseInt(shield || '0')
    };
  });
}

async function resetTokens(userName, tokens = { reviewTokens: 3, attackTokens: 0, shieldTokens: 1 }) {
  const response = await fetch(`${BACKEND_URL}/api/test/reset-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userName,
      projectCode: PROJECT_CODE,
      ...tokens
    })
  });
  return response.json();
}

// Scenario 1: User A submits review and gains attack token
async function scenario1_SubmitReview() {
  console.log('\n📝 Scenario 1: User A submits review and gains attack token\n');
  
  // Reset tokens to initial state
  await resetTokens(TEST_USERS.userA, { reviewTokens: 3, attackTokens: 0, shieldTokens: 1 });
  console.log('🔄 Reset User A tokens to 3/0/1');
  
  const page = await setupPage(TEST_USERS.userA);
  await page.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  
  // Submit name and wait for tokens to appear
  await submitNameAndWaitForTokens(page, TEST_USERS.userA);
  
  // Wait a bit more for token state to stabilize after reset
  await sleep(2000);
  
  await saveScreenshot(page, 'userA-initial', 'User A initial state with 3 review tokens');
  
  const initialTokens = await getTokenCounts(page);
  console.log('Initial tokens:', initialTokens);
  
  // Enter essay
  await page.type('textarea', TEST_ESSAY);
  await sleep(500);
  await saveScreenshot(page, 'userA-essay-entered', 'User A entered essay text');
  
  // Submit review
  const submitBtn = await page.$('[data-testid="submit-review-btn"]');
  if (!submitBtn) throw new Error('Submit button not found');
  
  await submitBtn.click();
  console.log('⏳ Waiting for review to process...');
  
  // Wait for processing to complete (button text changes from "Processing..." back to normal)
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="submit-review-btn"]');
      return btn && btn.textContent && !btn.textContent.includes('Processing');
    },
    { timeout: 20000 }
  );
  
  // Wait for tokens to actually update in DOM
  await page.waitForFunction(
    (expectedAttack) => {
      const attack = document.querySelector('[data-testid="my-attack-tokens"]')?.textContent;
      const attackValue = parseInt(attack || '0');
      console.log('Current attack tokens:', attackValue, 'Expected:', expectedAttack);
      return attackValue === expectedAttack;
    },
    { timeout: 10000 },
    initialTokens.attack + 1
  );
  
  await sleep(500);
  await saveScreenshot(page, 'userA-review-complete', 'User A review completed - tokens updated');
  
  const newTokens = await getTokenCounts(page);
  console.log('Updated tokens:', newTokens);
  
  // Verify token changes
  if (newTokens.review !== initialTokens.review - 1) {
    throw new Error(`Expected review tokens to decrease by 1, got ${newTokens.review}`);
  }
  if (newTokens.attack !== initialTokens.attack + 1) {
    throw new Error(`Expected attack tokens to increase by 1, got ${newTokens.attack}`);
  }
  
  console.log('✅ Tokens updated correctly');
  
  // Check leaderboard appeared
  const leaderboardName = await page.$('[data-testid="leaderboard-top-1-name"]');
  if (leaderboardName) {
    await saveScreenshot(page, 'userA-leaderboard', 'Leaderboard updated with User A score');
    const topName = await page.evaluate(el => el.textContent, leaderboardName);
    console.log(`✅ Leaderboard shows: ${topName}`);
  }
  
  await page.close();
}

// Scenario 2: User B also submits to become attackable
async function scenario2_UserBSubmits() {
  console.log('\n📝 Scenario 2: User B submits review\n');
  
  // Reset tokens to initial state
  await resetTokens(TEST_USERS.userB, { reviewTokens: 3, attackTokens: 0, shieldTokens: 1 });
  console.log('🔄 Reset User B tokens to 3/0/1');
  
  const page = await setupPage(TEST_USERS.userB);
  
  // Go directly to project page (User B should start fresh)
  await page.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  
  await submitNameAndWaitForTokens(page, TEST_USERS.userB);
  await saveScreenshot(page, 'userB-initial', 'User B initial state');
  
  const initialTokens = await getTokenCounts(page);
  
  // Enter essay and submit
  await page.type('textarea', TEST_ESSAY);
  await sleep(500);
  
  const submitBtn = await page.$('[data-testid="submit-review-btn"]');
  await submitBtn.click();
  console.log('⏳ User B submitting review...');
  
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="submit-review-btn"]');
      return btn && btn.textContent && !btn.textContent.includes('Processing');
    },
    { timeout: 20000 }
  );
  
  await sleep(1000);
  await saveScreenshot(page, 'userB-review-complete', 'User B review completed');
  
  const tokens = await getTokenCounts(page);
  console.log('User B tokens:', tokens);
  
  await page.close();
}

// Scenario 3: User A attacks User B, B uses shield
async function scenario3_AttackWithShield() {
  console.log('\n⚔️  Scenario 3: User A attacks User B, B uses shield\n');
  
  // Open two pages
  const pageA = await browser.newPage();
  const pageB = await browser.newPage();
  
  await setSession(pageA, TEST_USERS.userA);
  await setSession(pageB, TEST_USERS.userB);
  
  await pageA.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  await pageB.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  
  await submitNameAndWaitForTokens(pageA, TEST_USERS.userA);
  await submitNameAndWaitForTokens(pageB, TEST_USERS.userB);
  
  await saveScreenshot(pageA, 'userA-can-attack', 'User A has attack token available');
  
  const tokensABefore = await getTokenCounts(pageA);
  const tokensBBefore = await getTokenCounts(pageB);
  console.log('Before attack - A:', tokensABefore, 'B:', tokensBBefore);
  
  // User A clicks attack
  await pageA.click('[data-testid="attack-player-btn"]');
  await sleep(1000);
  
  // Wait for attack modal
  await waitForElement(pageA, '[data-testid="target-list"]');
  await saveScreenshot(pageA, 'userA-attack-modal', 'User A attack modal showing target list');
  
  // Find and click attack on User B
  const targetRows = await pageA.$$('[data-testid="target-row"]');
  let attackedB = false;
  for (const row of targetRows) {
    const name = await row.$eval('[data-testid="target-name"]', el => el.textContent);
    if (name === TEST_USERS.userB) {
      const attackBtn = await row.$('[data-testid="attack-btn"]');
      await attackBtn.click();
      attackedB = true;
      console.log('⚔️  User A initiated attack on User B');
      break;
    }
  }
  
  if (!attackedB) throw new Error('Could not find User B in target list');
  
  await sleep(2000);
  await saveScreenshot(pageA, 'userA-attack-initiated', 'User A attack initiated - waiting for result');
  
  // User B should see defense modal
  await waitForElement(pageB, '[data-testid="pending-attack-modal"]', 5000);
  await saveScreenshot(pageB, 'userB-defense-modal', 'User B sees incoming attack - 15s countdown');
  
  // User B uses shield
  const useShieldBtn = await pageB.$('[data-testid="use-shield-btn"]');
  if (!useShieldBtn) throw new Error('Shield button not found');
  
  await useShieldBtn.click();
  console.log('🛡️  User B used shield');
  
  await sleep(2000);
  await sleep(2000);
  
  await saveScreenshot(pageA, 'userA-after-blocked-attack', 'User A after blocked attack');
  await saveScreenshot(pageB, 'userB-after-shield-use', 'User B after using shield');
  
  const tokensAAfter = await getTokenCounts(pageA);
  const tokensBAfter = await getTokenCounts(pageB);
  console.log('After shield - A:', tokensAAfter, 'B:', tokensBAfter);
  
  // Verify: B lost shield, A did not gain review token, B kept review tokens
  if (tokensBAfter.shield !== tokensBBefore.shield - 1) {
    throw new Error(`Expected B to lose 1 shield, before: ${tokensBBefore.shield}, after: ${tokensBAfter.shield}`);
  }
  if (tokensBAfter.review !== tokensBBefore.review) {
    throw new Error('User B should not lose review token when using shield');
  }
  if (tokensAAfter.review !== tokensABefore.review) {
    throw new Error('User A should not gain review token when blocked by shield');
  }
  
  console.log('✅ Shield defense successful');
  
  await pageA.close();
  await pageB.close();
}

// Scenario 4: Reset and test attack without shield (token transfer)
async function scenario4_AttackWithoutShield() {
  console.log('\n⚔️  Scenario 4: Attack without shield - token transfer\n');
  
  // Reset both users to fresh state
  await resetTokens(TEST_USERS.userA, { reviewTokens: 2, attackTokens: 1, shieldTokens: 0 });
  await resetTokens(TEST_USERS.userB, { reviewTokens: 2, attackTokens: 0, shieldTokens: 0 });
  console.log('🔄 Reset tokens: A has attack token, B has no shield');
  
  const pageA = await browser.newPage();
  const pageB = await browser.newPage();
  
  await setSession(pageA, TEST_USERS.userA);
  await setSession(pageB, TEST_USERS.userB);
  
  await pageA.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  await pageB.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  
  await submitNameAndWaitForTokens(pageA, TEST_USERS.userA);
  await submitNameAndWaitForTokens(pageB, TEST_USERS.userB);
  
  await sleep(1000);
  await sleep(1000);
  
  await saveScreenshot(pageA, 'userA-before-transfer-attack', 'User A before token transfer attack');
  await saveScreenshot(pageB, 'userB-before-transfer-attack', 'User B before token transfer attack (no shield)');
  
  const tokensABefore = await getTokenCounts(pageA);
  const tokensBBefore = await getTokenCounts(pageB);
  console.log('Before transfer attack - A:', tokensABefore, 'B:', tokensBBefore);
  
  // User A attacks
  await pageA.click('[data-testid="attack-player-btn"]');
  await sleep(1000);
  await waitForElement(pageA, '[data-testid="target-list"]');
  
  const targetRows = await pageA.$$('[data-testid="target-row"]');
  for (const row of targetRows) {
    const name = await row.$eval('[data-testid="target-name"]', el => el.textContent);
    if (name === TEST_USERS.userB) {
      const attackBtn = await row.$('[data-testid="attack-btn"]');
      await attackBtn.click();
      console.log('⚔️  User A attacks User B (who has no shield)');
      break;
    }
  }
  
  await sleep(2000);
  
  // User B sees modal and accepts (no shield option)
  await waitForElement(pageB, '[data-testid="pending-attack-modal"]', 5000);
  await saveScreenshot(pageB, 'userB-no-shield-modal', 'User B defense modal - no shield available');
  
  const acceptBtn = await pageB.$('[data-testid="dont-use-shield-btn"]');
  await acceptBtn.click();
  console.log('❌ User B accepted token loss');
  
  await sleep(2000);
  await sleep(2000);
  
  await saveScreenshot(pageA, 'userA-after-successful-attack', 'User A after successful attack - gained token');
  await saveScreenshot(pageB, 'userB-after-token-loss', 'User B after losing review token');
  
  const tokensAAfter = await getTokenCounts(pageA);
  const tokensBAfter = await getTokenCounts(pageB);
  console.log('After transfer - A:', tokensAAfter, 'B:', tokensBAfter);
  
  // Verify token transfer
  if (tokensBAfter.review !== tokensBBefore.review - 1) {
    throw new Error(`Expected B to lose 1 review token, before: ${tokensBBefore.review}, after: ${tokensBAfter.review}`);
  }
  if (tokensAAfter.review !== tokensABefore.review + 1) {
    throw new Error(`Expected A to gain 1 review token, before: ${tokensABefore.review}, after: ${tokensAAfter.review}`);
  }
  
  console.log('✅ Token transfer successful');
  
  await pageA.close();
  await pageB.close();
}

// Scenario 5: Test cooldown enforcement
async function scenario5_CooldownEnforcement() {
  console.log('\n⏱️  Scenario 5: Cooldown enforcement (10 seconds)\n');
  
  await resetTokens(TEST_USERS.userA, { reviewTokens: 3, attackTokens: 0, shieldTokens: 1 });
  
  const page = await browser.newPage();
  await setSession(page, TEST_USERS.userA);
  await page.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  
  await submitNameAndWaitForTokens(page, TEST_USERS.userA);
  
  // Submit first review
  await page.type('textarea', TEST_ESSAY);
  await page.click('[data-testid="submit-review-btn"]');
  console.log('⏳ First review submitting...');
  
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="submit-review-btn"]');
      return btn && !btn.disabled;
    },
    { timeout: 15000 }
  );
  
  await sleep(1000);
  await saveScreenshot(page, 'cooldown-after-first-submit', 'Cooldown active after first submit');
  
  // Check button shows cooldown
  const buttonText = await page.$eval('[data-testid="submit-review-btn"]', el => el.textContent);
  console.log('Button text:', buttonText);
  
  if (!buttonText.includes('Wait')) {
    throw new Error('Expected button to show cooldown message');
  }
  
  console.log('✅ Cooldown enforced - button disabled');
  console.log('⏳ Waiting 12 seconds for cooldown to expire...');
  
  await sleep(12000);
  await saveScreenshot(page, 'cooldown-expired', 'Cooldown expired - can submit again');
  
  const buttonTextAfter = await page.$eval('[data-testid="submit-review-btn"]', el => el.textContent);
  console.log('Button text after cooldown:', buttonTextAfter);
  
  if (buttonTextAfter.includes('Wait')) {
    throw new Error('Cooldown should have expired');
  }
  
  console.log('✅ Cooldown expired correctly');
  
  await page.close();
}

// Scenario 6: Protection - can't attack user with 0 review tokens
async function scenario6_ProtectionTest() {
  console.log('\n🛡️  Scenario 6: Protection - cannot attack user with 0 tokens\n');
  
  await resetTokens(TEST_USERS.userA, { reviewTokens: 2, attackTokens: 1, shieldTokens: 0 });
  await resetTokens(TEST_USERS.userB, { reviewTokens: 0, attackTokens: 0, shieldTokens: 0 });
  console.log('🔄 Reset: A has attack, B has 0 review tokens');
  
  const page = await browser.newPage();
  await setSession(page, TEST_USERS.userA);
  await page.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  
  await submitNameAndWaitForTokens(page, TEST_USERS.userA);
  await page.click('[data-testid="attack-player-btn"]');
  await sleep(1000);
  
  await waitForElement(page, '[data-testid="target-list"]');
  await saveScreenshot(page, 'protection-target-list', 'Target list showing User B as protected');
  
  // Find User B row and check if disabled
  const targetRows = await page.$$('[data-testid="target-row"]');
  let foundProtected = false;
  
  for (const row of targetRows) {
    const name = await row.$eval('[data-testid="target-name"]', el => el.textContent);
    if (name === TEST_USERS.userB) {
      const attackBtn = await row.$('[data-testid="attack-btn"]');
      const isDisabled = await page.evaluate(btn => btn.disabled, attackBtn);
      const btnText = await page.evaluate(btn => btn.textContent, attackBtn);
      
      console.log(`User B button: disabled=${isDisabled}, text="${btnText}"`);
      
      if (!isDisabled || !btnText.includes('Protected')) {
        throw new Error('User B should be protected (disabled and showing Protected)');
      }
      
      foundProtected = true;
      break;
    }
  }
  
  if (!foundProtected) {
    throw new Error('User B not found in target list');
  }
  
  console.log('✅ Protection works - cannot attack user with 0 tokens');
  
  await page.close();
}

// Generate HTML report
async function generateReport() {
  console.log('\n📄 Generating HTML report...\n');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E Test Report - Token Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .timestamp { opacity: 0.9; font-size: 0.9rem; }
    .scenarios {
      padding: 40px;
    }
    .scenario {
      margin-bottom: 60px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 40px;
    }
    .scenario:last-child { border-bottom: none; }
    .scenario-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }
    .scenario-number {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.2rem;
    }
    .scenario-title {
      font-size: 1.5rem;
      color: #333;
      font-weight: 600;
    }
    .scenario-description {
      color: #666;
      margin-bottom: 20px;
      padding-left: 55px;
      line-height: 1.6;
    }
    .screenshot {
      margin-bottom: 30px;
      padding-left: 55px;
    }
    .screenshot img {
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      border: 1px solid #e0e0e0;
      transition: transform 0.3s ease;
      cursor: pointer;
    }
    .screenshot img:hover {
      transform: scale(1.02);
    }
    .screenshot-caption {
      margin-top: 12px;
      font-size: 0.9rem;
      color: #666;
      font-style: italic;
    }
    footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }
    .summary {
      background: #f8f9fa;
      padding: 30px;
      margin: 0 40px 40px 40px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    .summary h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.3rem;
    }
    .summary ul {
      list-style: none;
      padding-left: 0;
    }
    .summary li {
      padding: 8px 0;
      color: #555;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .summary li::before {
      content: "✅";
      font-size: 1.2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎮 Token Game E2E Test Report</h1>
      <p class="timestamp">Generated: ${new Date().toISOString()}</p>
      <p class="timestamp">Project Code: ${PROJECT_CODE}</p>
    </header>
    
    <div class="summary">
      <h2>Test Summary</h2>
      <ul>
        <li>Submit review and gain attack token</li>
        <li>Multiple users can submit reviews</li>
        <li>Attack with shield defense (token blocked)</li>
        <li>Attack without shield (token transfer)</li>
        <li>Cooldown enforcement (10 seconds)</li>
        <li>Protection for users with 0 tokens</li>
      </ul>
    </div>
    
    <div class="scenarios">
      ${scenarios.map((scenario, idx) => {
        const scenarioNum = scenario.filename.split('-')[0];
        const scenarioName = scenario.filename.substring(2).replace('.png', '').replace(/-/g, ' ').toUpperCase();
        
        return `
          <div class="scenario">
            <div class="scenario-header">
              <div class="scenario-number">${scenarioNum}</div>
              <div class="scenario-title">${scenarioName}</div>
            </div>
            <div class="scenario-description">${scenario.description}</div>
            <div class="screenshot">
              <img src="${scenario.filename}" alt="${scenario.description}" onclick="window.open('${scenario.filename}', '_blank')">
              <div class="screenshot-caption">${new Date(scenario.timestamp).toLocaleString()}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    
    <footer>
      <p>Agentic AI Learning Platform - E2E Test Suite</p>
      <p>Total Screenshots: ${scenarios.length}</p>
    </footer>
  </div>
</body>
</html>`;
  
  await fs.writeFile(join(SCREENSHOT_DIR, 'report.html'), html);
  console.log(`✅ Report generated: ${join(SCREENSHOT_DIR, 'report.html')}`);
}

// Main test runner
async function runTests() {
  try {
    await setup();
    
    // Run all scenarios
    await scenario1_SubmitReview();
    await scenario2_UserBSubmits();
    await scenario3_AttackWithShield();
    await scenario4_AttackWithoutShield();
    await scenario5_CooldownEnforcement();
    await scenario6_ProtectionTest();
    
    // Generate report
    await generateReport();
    
    console.log('\n✨ All tests passed! ✨\n');
    console.log(`📊 View report: file://${join(SCREENSHOT_DIR, 'report.html')}\n`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Try to capture failure screenshots
    if (browser) {
      const pages = await browser.pages();
      for (let i = 0; i < pages.length; i++) {
        try {
          await pages[i].screenshot({ 
            path: join(SCREENSHOT_DIR, `FAIL-page${i}.png`),
            fullPage: true
          });
        } catch (e) {
          // Ignore screenshot errors
        }
      }
    }
    
    throw error;
  } finally {
    await cleanup();
  }
}

// Run tests
runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
