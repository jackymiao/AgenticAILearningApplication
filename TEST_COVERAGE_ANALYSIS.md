# Test Coverage Analysis & Recommendations

## Current Test Status

### Existing E2E Tests (6 scenarios in `e2e/game-attack.spec.mjs`)
- ✅ **Scenario 1**: User A submits review and gains attack token
- ✅ **Scenario 2**: User B submits review to become attackable
- ✅ **Scenario 3**: User A attacks User B with shield
- ✅ **Scenario 4**: Attack without shield (token transfer)
- ✅ **Scenario 5**: Review cooldown enforcement
- ✅ **Scenario 6**: Protection - can't attack user with 0 review tokens

### Existing Unit Tests (5 test files in `backend/src/routes/__tests__/`)
- ✅ **cooldown.test.ts** (446 lines) - Review cooldown feature
- ✅ **submit-review.test.ts** (333 lines) - Review submission & token updates
- ✅ **attack-notification.test.ts** (389 lines) - Attack notifications
- ✅ **game.test.ts** (113 lines) - Project enabled checks
- ✅ **public.test.ts** (84 lines) - Public endpoints

**Total: ~1,364 lines of unit tests + 813 lines of E2E tests**

---

## What's Currently Tested ✅

### Core Game Mechanics
- Token initialization (review: 3, attack: 0, shield: 1)
- Token updates on review submission (review -1, attack +1)
- Attack/defense actions
- Shield usage
- Cooldown enforcement
- Project enabled/disabled checks
- Player protection rules

### Token System
- Correct initialization
- Decrement on review submission
- Increment on review received
- Prevention of actions with 0 tokens
- Token persistence across page refresh

### Score Calculation
- Final score calculation as average of 3 categories
- Score rounding behavior
- Leaderboard updates

### Cooldown System
- Configurable per project
- Correct remaining time calculation
- Prevention of duplicate reviews within cooldown

### Attack/Defense System
- Attack token requirement
- Attack notification delivery
- Shield protection
- Token transfer on successful attack

---

## Critical Gaps in Test Coverage ⚠️

### 1. **Authentication & Authorization**
- ❌ Admin signup/login flows
- ❌ Password hashing and validation
- ❌ Session management
- ❌ Permission checks (admin-only endpoints)
- ❌ Logout functionality

**Recommended Tests:**
```
- Admin signup with valid/invalid credentials
- Admin login with correct/incorrect password
- Session validation and expiration
- Role-based access control (admin vs student)
- Logout clears session properly
```

### 2. **Data Validation & Input Sanitization**
- ❌ Essay text validation (word limits)
- ❌ Special character handling
- ❌ SQL injection prevention
- ❌ XSS prevention
- ❌ File upload validation (if applicable)

**Recommended Tests:**
```
- Essay exceeding word limit is rejected
- Essays with special characters are handled correctly
- Invalid project codes are rejected
- Invalid student names are validated
- HTML/script tags in essays are escaped
```

### 3. **Database Integrity**
- ❌ Concurrent request handling
- ❌ Race conditions in token updates
- ❌ Transaction rollback scenarios
- ❌ Foreign key constraints
- ❌ Unique constraint violations

**Recommended Tests:**
```
- Multiple simultaneous reviews don't corrupt token state
- Concurrent attacks are handled atomically
- Duplicate project codes are prevented
- Invalid foreign keys are rejected
- Orphaned records don't break queries
```

### 4. **Leaderboard & Scoring**
- ❌ Leaderboard ranking accuracy
- ❌ Tie-breaking logic
- ❌ Score updates in real-time
- ❌ User filtering on leaderboard
- ❌ Pagination/limits

**Recommended Tests:**
```
- Leaderboard sorted by score descending
- Multiple users with same score are handled
- Leaderboard updates when score changes
- Only project participants appear
- Leaderboard respects enabled/disabled status
```

### 5. **Project Management**
- ❌ Project creation validation
- ❌ Project settings updates
- ❌ Project deletion
- ❌ Import student roster
- ❌ Enable/disable projects

**Recommended Tests:**
```
- Create project with valid settings
- Cannot create duplicate project codes
- Project settings update correctly
- Student roster import validates format
- Student roster import handles duplicates
- Disabling project blocks all interactions
```

### 6. **Review Submission & Feedback**
- ❌ Multiple submissions same essay
- ❌ Review scoring accuracy
- ❌ Feedback generation and storage
- ❌ Review history pagination
- ❌ Empty/null essay handling

**Recommended Tests:**
```
- Can't submit multiple reviews in cooldown
- Review scores are saved correctly
- Feedback scores vary by category
- Review history shows all reviews
- Empty essays are rejected
- Null/undefined handling
```

### 7. **WebSocket Real-time Features**
- ❌ Connection establishment
- ❌ Message delivery reliability
- ❌ Disconnection handling
- ❌ Heartbeat/keepalive
- ❌ Error recovery

**Recommended Tests:**
```
- WebSocket connects on page load
- Attack notifications deliver in real-time
- Token updates broadcast to all connected clients
- Disconnection triggers reconnection
- Heartbeat prevents timeout
- Message ordering is preserved
```

### 8. **Error Handling & Edge Cases**
- ❌ 404/500 error responses
- ❌ Network timeout handling
- ❌ Database connection failures
- ❌ Malformed JSON requests
- ❌ Missing required fields

**Recommended Tests:**
```
- 404 for non-existent project
- 400 for missing required fields
- 500 on database errors (with graceful recovery)
- 403 for disabled projects
- Invalid JSON is rejected
```

### 9. **Frontend-Specific Tests**
- ❌ Component rendering
- ❌ State management
- ❌ Form validation
- ❌ Error display
- ❌ Loading states
- ❌ Button interactions

**Recommended Tests:**
```
- Review form displays correctly
- Submit button disabled while processing
- Error messages display for failures
- Token counts update in real-time
- Tab switching works correctly
- Leaderboard refreshes periodically
```

### 10. **Performance & Load Testing**
- ❌ Bulk review submissions
- ❌ Large class sizes (100+ students)
- ❌ Concurrent users
- ❌ Query performance with large datasets
- ❌ Memory leaks

**Recommended Tests:**
```
- System handles 100+ simultaneous reviews
- Leaderboard generation under load
- WebSocket handles 50+ connections
- No memory leaks on page refresh
- API response time < 500ms
```

---

## Recommended Testing Strategy

### Priority 1 (High - Do These First)
1. **Authentication Tests** - Critical security
2. **Data Validation** - Prevent corrupted data
3. **Database Integrity** - Prevent race conditions
4. **Error Handling** - Ensure graceful failures

### Priority 2 (Medium - Do These Next)
5. **Project Management** - Admin functionality
6. **Leaderboard Accuracy** - Core feature
7. **WebSocket Real-time** - User experience
8. **Review Edge Cases** - Data quality

### Priority 3 (Lower - Nice to Have)
9. **Frontend Component Tests** - UI reliability
10. **Performance Tests** - Scalability

---

## Suggested New Test Files Structure

```
backend/src/routes/__tests__/
├── auth.test.ts                  # NEW: Admin authentication
├── project-management.test.ts     # NEW: Project CRUD operations
├── input-validation.test.ts       # NEW: Data validation & sanitization
├── database-integrity.test.ts     # NEW: Concurrency & race conditions
├── leaderboard.test.ts            # NEW: Scoring & ranking
├── error-handling.test.ts         # NEW: HTTP error responses
├── concurrent-operations.test.ts  # NEW: Load testing basics
├── cooldown.test.ts               # EXISTING
├── submit-review.test.ts          # EXISTING
├── attack-notification.test.ts    # EXISTING
├── game.test.ts                   # EXISTING
└── public.test.ts                 # EXISTING

frontend/src/tests/                # NEW: Frontend tests
├── ProjectPage.test.jsx            
├── CreateProject.test.jsx          
├── Leaderboard.test.jsx            
├── ReviewForm.test.jsx             
└── WebSocket.test.js               
```

---

## Test Implementation Examples

### Example 1: Authentication Test
```typescript
// backend/src/routes/__tests__/auth.test.ts
describe('Admin Authentication', () => {
  it('should sign up new admin with valid credentials', async () => {
    const response = await request(app)
      .post('/auth/admin/signup')
      .send({
        username: 'newadmin',
        password: 'SecurePass123'
      });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('adminId');
  });

  it('should reject duplicate admin username', async () => {
    const response = await request(app)
      .post('/auth/admin/signup')
      .send({
        username: 'existingadmin',
        password: 'Pass123'
      });
    expect(response.status).toBe(409); // Conflict
  });

  it('should login with correct credentials', async () => {
    const response = await request(app)
      .post('/auth/admin/login')
      .send({
        username: 'admin',
        password: 'correctpass'
      });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
  });
});
```

### Example 2: Input Validation Test
```typescript
// backend/src/routes/__tests__/input-validation.test.ts
describe('Input Validation', () => {
  it('should reject essay exceeding word limit', async () => {
    const longEssay = 'word '.repeat(1000); // Exceeds 150 word limit
    const response = await request(app)
      .post('/public/projects/ABC123/reviews')
      .send({
        userName: 'student1',
        essay: longEssay
      });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('word limit');
  });

  it('should handle HTML injection safely', async () => {
    const maliciousEssay = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/public/projects/ABC123/reviews')
      .send({
        userName: 'student1',
        essay: maliciousEssay
      });
    expect(response.status).toBe(200);
    // Verify stored essay is escaped
    expect(response.body.essay).not.toContain('<script>');
  });
});
```

### Example 3: Database Concurrency Test
```typescript
// backend/src/routes/__tests__/database-integrity.test.ts
describe('Database Integrity', () => {
  it('should handle concurrent token updates atomically', async () => {
    // Simulate 5 concurrent review submissions
    const promises = Array(5).fill(null).map((_, i) =>
      request(app)
        .post('/public/projects/ABC123/reviews')
        .send({
          userName: 'student1',
          essay: `Essay ${i}`
        })
    );

    await Promise.all(promises);
    
    // Verify tokens are decremented exactly 5 times
    const state = await pool.query(
      'SELECT review_tokens FROM player_state WHERE user_name_norm = $1',
      ['student1']
    );
    expect(state.rows[0].review_tokens).toBe(-2); // 3 initial - 5 submissions
  });
});
```

---

## Quick Wins to Implement First

These are relatively small but high-impact tests:

1. **Add 5 error handling tests** (~50 lines)
   - Missing fields
   - Invalid project codes
   - Disabled projects

2. **Add 3 input validation tests** (~100 lines)
   - Word limit
   - HTML escaping
   - Empty fields

3. **Add 2 leaderboard tests** (~80 lines)
   - Score ordering
   - Ranking updates

4. **Add 2 authentication tests** (~100 lines)
   - Login/logout
   - Permission checks

**Total: ~330 lines of high-value tests**

---

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- cooldown.test.ts

# Run with coverage
npm run test -- --coverage

# Run E2E tests
npm run e2e:test

# Run specific E2E scenario
E2E_TEST=1 node e2e/game-attack.spec.mjs
```

---

## Continuous Integration Recommendations

- Run all tests on every git commit
- Fail build if test coverage drops
- Run E2E tests nightly (they're slower)
- Generate coverage reports
- Alert on test failures

