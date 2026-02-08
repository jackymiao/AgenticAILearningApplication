# E2E Test Suite for Token Game

Complete end-to-end testing harness for the Agentic AI Learning token game mechanics.

## Prerequisites

1. **Backend running** on `http://localhost:3000`
2. **Frontend running** on `http://localhost:5174`
3. **Database** accessible (PostgreSQL)
4. **Node 18+** installed

## Quick Start

```bash
# 1. Run complete E2E suite (seed + test)
npm run e2e:all

# 2. Or run individually:
npm run e2e:seed  # Seed database with test data
npm run e2e:test  # Run Puppeteer tests

# 3. Debug mode (with visible browser)
npm run e2e:debug
```

## What Gets Tested

### 📊 Scenario 1: Submit Review
- User A submits essay for review
- Verifies: review tokens decrease (-1), attack tokens increase (+1)
- Checks leaderboard updates with AI score

### 📊 Scenario 2: Multiple Users
- User B also submits review
- Both users now have attack tokens
- Both appear in target list

### ⚔️ Scenario 3: Attack with Shield Defense
- User A attacks User B
- User B uses shield to block
- Verifies: B loses shield (-1), B keeps review tokens, A doesn't gain tokens

### ⚔️ Scenario 4: Attack without Shield
- User A attacks User B (B has no shield)
- User B accepts token loss
- Verifies: B loses review token (-1), A gains review token (+1)

### ⏱️ Scenario 5: Cooldown Enforcement
- User submits review twice
- First succeeds, second is blocked by 10s cooldown
- After cooldown expires, can submit again

### 🛡️ Scenario 6: Protection Test
- User B has 0 review tokens
- User A cannot attack User B (protected)
- Attack button disabled with "Protected" message

## Test Configuration

| Variable | Default | E2E Value | Description |
|----------|---------|-----------|-------------|
| `E2E_TEST` | `0` | `1` | Enables test mode (mocks AI) |
| `REVIEW_COOLDOWN_MS` | `120000` | `10000` | Review cooldown (10s for tests) |
| `HEADLESS` | `true` | `false` (debug) | Browser visibility |

## Test Data

- **Project Code:** `ABC123`
- **Users:** 
  - `demoUser1` - User A in tests
  - `demoUser2` - User B in tests
- **Initial Tokens:**
  - Review: 3
  - Attack: 0
  - Shield: 1

## Output

### Screenshots
All screenshots saved to `e2e/screenshots/`:
- `1-userA-initial.png`
- `2-userA-essay-entered.png`
- `3-userA-review-complete.png`
- ... (20+ screenshots total)

### HTML Report
View comprehensive report:
```bash
open e2e/screenshots/report.html
```

Report includes:
- All screenshots with timestamps
- Scenario descriptions
- Test summary
- Pass/fail status

## Test Routes (Backend)

Test-only endpoints (enabled when `E2E_TEST=1`):

- `POST /api/test/set-session` - Set session for user
- `POST /api/test/reset-tokens` - Reset token state
- `DELETE /api/test/clear-attacks` - Clear pending attacks
- `GET /api/test/health` - Check test mode status

## AI Mocking

When `E2E_TEST=1`, review submissions return fixed mock data:
```javascript
{
  final_score: 88,
  details: {
    content: { score: 22, ... },
    structure: { score: 22, ... },
    mechanics: { score: 22, ... }
  }
}
```

This ensures:
- ✅ Deterministic test results
- ✅ Fast execution (no API calls)
- ✅ No API costs
- ✅ Offline testing

## Troubleshooting

### Backend not responding
```bash
# Check backend is running
curl http://localhost:3000/api/health

# Restart backend with E2E mode
cd backend
E2E_TEST=1 REVIEW_COOLDOWN_MS=10000 npm run dev
```

### Frontend not loading
```bash
# Check frontend is running
curl http://localhost:5174

# Restart frontend
cd frontend
npm run dev
```

### Database connection errors
```bash
# Check DATABASE_URL in backend/.env
# Run seed again to reset state
npm run e2e:seed
```

### Tests failing
```bash
# Check failure screenshots
ls -la e2e/screenshots/FAIL-*.png

# Run in debug mode to watch browser
npm run e2e:debug
```

## Architecture

```
e2e/
├── seed.mjs              # Database seeding
├── game-attack.spec.mjs  # Puppeteer test scenarios
└── screenshots/          # Output directory
    ├── *.png            # Individual screenshots
    └── report.html      # Generated report

backend/src/routes/
└── test.ts              # Test-only endpoints

frontend/src/
├── components/          # data-testid attributes added
└── pages/               # data-testid attributes added
```

## Extending Tests

### Add New Scenario

1. Create test function in `game-attack.spec.mjs`:
```javascript
async function scenario7_MyNewTest() {
  console.log('\n🧪 Scenario 7: My new test\n');
  
  const page = await browser.newPage();
  await setSession(page, TEST_USERS.userA);
  await page.goto(`${FRONTEND_URL}/projects/${PROJECT_CODE}`);
  
  // Your test logic
  await saveScreenshot(page, 'my-test-step', 'Description');
  
  await page.close();
}
```

2. Add to test runner:
```javascript
async function runTests() {
  // ... existing scenarios
  await scenario7_MyNewTest();
  // ...
}
```

### Add Test Selectors

Add `data-testid` to component:
```jsx
<button data-testid="my-new-button">Click Me</button>
```

Use in test:
```javascript
await page.click('[data-testid="my-new-button"]');
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: |
    npm run e2e:seed
    E2E_TEST=1 REVIEW_COOLDOWN_MS=10000 npm run e2e:test
    
- name: Upload Screenshots
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: e2e-screenshots
    path: e2e/screenshots/
```

## Notes

- Tests use **ABC123** project (must exist in database)
- Seed script creates project if missing
- Tests can run repeatedly (idempotent)
- No cleanup needed between runs (seed resets state)
- Safe to run against development database
- Use `DATABASE_URL_TEST` for separate test database

## Support

For issues or questions:
1. Check screenshots in `e2e/screenshots/`
2. Review HTML report
3. Run in debug mode: `npm run e2e:debug`
4. Check backend logs for E2E_TEST mode confirmation
