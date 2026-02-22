# How to Use the New Tests - Quick Start Guide

## 📋 Quick Summary

I've created **4 new test files** with **64 tests** that cover:
- ✅ **Authentication** - Admin login/signup/logout
- ✅ **Input Validation** - Word limits, HTML injection, special characters
- ✅ **Error Handling** - 404, 400, 403 responses
- ✅ **Leaderboard** - Score ranking and calculations

## 🚀 Running the Tests

### Option 1: Run ALL tests
```bash
cd /Users/patrickmiao/FDUProjects/AgenticAILearning/backend
npm test
```

### Option 2: Run SPECIFIC test file
```bash
npm test -- auth.test.ts
npm test -- input-validation.test.ts
npm test -- error-handling.test.ts
npm test -- leaderboard.test.ts
```

### Option 3: Run with WATCH mode (auto-rerun on changes)
```bash
npm test -- --watch
```

### Option 4: Run with COVERAGE report
```bash
npm test -- --coverage
```

## 📊 What Gets Tested

### Test File 1: `auth.test.ts` (14 tests)
**Tests admin authentication**

Catches issues with:
- ❌ Admin can signup twice with same username
- ❌ Admin can login with wrong password
- ❌ Session isn't cleared after logout
- ❌ Weak passwords are accepted

```bash
npm test -- auth.test.ts

# Should see: ✅ 14 tests pass
```

### Test File 2: `input-validation.test.ts` (20 tests)
**Tests data validation and security**

Catches issues with:
- ❌ Essays longer than limit are accepted
- ❌ HTML/JavaScript tags aren't escaped
- ❌ Empty essays are accepted
- ❌ Special characters break the system

```bash
npm test -- input-validation.test.ts

# Should see: ✅ 20 tests pass
```

### Test File 3: `error-handling.test.ts` (18 tests)
**Tests error responses**

Catches issues with:
- ❌ Wrong HTTP status codes (404, 400, 403)
- ❌ Missing error messages in responses
- ❌ Disabled projects don't return 403
- ❌ Invalid JSON doesn't return 400

```bash
npm test -- error-handling.test.ts

# Should see: ✅ 18 tests pass
```

### Test File 4: `leaderboard.test.ts` (12 tests)
**Tests scoring and leaderboard**

Catches issues with:
- ❌ Leaderboard not sorted by score
- ❌ Final score calculation is wrong
- ❌ Leaderboard doesn't update with new scores
- ❌ Multiple reviews corrupt the score

```bash
npm test -- leaderboard.test.ts

# Should see: ✅ 12 tests pass
```

## 📈 Combining with Existing Tests

You already have 5 test files with ~1,364 lines of tests:
- ✅ cooldown.test.ts (446 lines)
- ✅ submit-review.test.ts (333 lines)
- ✅ attack-notification.test.ts (389 lines)
- ✅ game.test.ts (113 lines)
- ✅ public.test.ts (84 lines)

NEW tests add:
- ✅ auth.test.ts (157 lines)
- ✅ input-validation.test.ts (285 lines)
- ✅ error-handling.test.ts (242 lines)
- ✅ leaderboard.test.ts (284 lines)

**Total: 1,428+ lines of test coverage**

## 🔍 Understanding Test Output

When you run `npm test`, you'll see:

```
PASS  src/routes/__tests__/auth.test.ts
  Admin Authentication
    POST /auth/admin/signup
      ✓ should sign up new admin with valid credentials (45ms)
      ✓ should reject duplicate admin username (32ms)
      ✓ should reject missing username (28ms)
      ✓ should reject missing password (25ms)
      ✓ should reject weak password (30ms)
    POST /auth/admin/login
      ✓ should login with correct credentials (38ms)
      ✓ should reject incorrect password (35ms)
      ✓ should reject non-existent user (29ms)
      ✓ should reject missing username (26ms)
      ✓ should reject missing password (24ms)
    GET /auth/me
      ✓ should return current admin info when authenticated (42ms)
      ✓ should return 401 when not authenticated (20ms)
    POST /auth/logout
      ✓ should logout successfully (48ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Time:        2.3s
```

✅ **Green checkmarks** = Tests passed  
❌ **Red X marks** = Tests failed (check error message)

## 🎯 How Tests Help During Development

### Scenario 1: You change the authentication code
```bash
npm test -- auth.test.ts
# If you broke something, tests will fail immediately ⚠️
```

### Scenario 2: You modify input validation
```bash
npm test -- input-validation.test.ts
# Ensures word limits and XSS protection still work ✅
```

### Scenario 3: You change error handling
```bash
npm test -- error-handling.test.ts
# Verifies correct HTTP status codes are returned 📍
```

### Scenario 4: You modify scoring/leaderboard
```bash
npm test -- leaderboard.test.ts
# Confirms ranking and scores are correct 🏆
```

## 📝 Example: Adding Your Own Test

If you want to add a test for a new feature:

```typescript
// In backend/src/routes/__tests__/input-validation.test.ts

describe('New Feature - Example', () => {
  it('should do something specific', async () => {
    const response = await request(app)
      .post('/public/projects/TEST01/reviews')
      .send({
        userName: 'student1',
        essay: 'test essay'
      });

    expect(response.status).toBe(200);  // Check status code
    expect(response.body).toHaveProperty('field');  // Check response has field
    expect(response.body.value).toBe('expected');  // Check value
  });
});
```

Then run:
```bash
npm test -- input-validation.test.ts
```

## ⚙️ Common Issues & Solutions

### Issue: Tests fail with "database connection error"
**Solution**: Make sure PostgreSQL is running
```bash
# Start PostgreSQL first
brew services start postgresql
# Then run tests
npm test
```

### Issue: "Module not found" errors
**Solution**: Install dependencies
```bash
npm install
npm test
```

### Issue: Some tests pass, some fail
**Solution**: Check which test failed and read the error message
```bash
npm test 2>&1 | grep FAIL
# Shows which test file has failures
```

### Issue: Tests are slow
**Solution**: Run only the tests you need
```bash
npm test -- auth.test.ts
# Faster than running all tests
```

## 📚 What Each Test Verifies

| Test File | What It Tests | Why It Matters |
|-----------|--------------|----------------|
| **auth.test.ts** | Admin can login/logout safely | Security - prevents unauthorized access |
| **input-validation.test.ts** | Essays meet requirements, no injection | Data quality - prevents corrupted data |
| **error-handling.test.ts** | Correct error messages returned | User experience - users understand what went wrong |
| **leaderboard.test.ts** | Scores calculated and ranked correctly | Core feature - students see fair rankings |

## 🚨 Critical Tests to Watch

Most important tests to pass:
1. ✅ `auth.test.ts` - If login breaks, no one can use the app
2. ✅ `error-handling.test.ts` - If errors crash, app is broken
3. ✅ `leaderboard.test.ts` - If scoring breaks, core feature fails
4. ✅ `input-validation.test.ts` - If validation fails, data gets corrupted

## 🎓 Learning Resources

- **Test file locations**: `/backend/src/routes/__tests__/`
- **Test framework**: Jest (see `backend/package.json` for version)
- **Database**: PostgreSQL (tests auto-cleanup after running)
- **Documentation**: See `TEST_COVERAGE_ANALYSIS.md` for detailed breakdown

## 🔄 Continuous Integration

To run tests automatically on every code change:

```bash
# Watch mode (automatically re-runs tests when files change)
npm test -- --watch

# Or run tests once before each commit
npm test && git commit -m "message"
```

## 📞 Need Help?

If a test fails:

1. **Read the error message** - It tells you what went wrong
2. **Check the test code** - It shows what was being tested
3. **Look at your changes** - Did you modify related code?
4. **Run just that test** - `npm test -- filename.test.ts`

Example error:
```
Expected: 200
Received: 400

at auth.test.ts:line 45
  should login with correct credentials
```

This means login returned 400 (bad request) instead of 200 (success). Check if you changed the login logic.

---

**Bottom line**: Run these tests whenever you make changes. If tests pass ✅, your code is good. If tests fail ❌, you broke something!

