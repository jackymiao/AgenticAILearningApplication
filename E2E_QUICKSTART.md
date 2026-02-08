# E2E Quick Reference Card

## 🚀 Quick Start (3 Commands)

```bash
# Terminal 1: Start backend
cd backend && E2E_TEST=1 REVIEW_COOLDOWN_MS=10000 npm run dev

# Terminal 2: Start frontend  
cd frontend && npm run dev

# Terminal 3: Run tests
npm run e2e:all
```

## 📝 NPM Commands

| Command | Description |
|---------|-------------|
| `npm run e2e:seed` | Seed database only |
| `npm run e2e:test` | Run tests (headless) |
| `npm run e2e:debug` | Run tests (visible browser) |
| `npm run e2e:all` | Seed + test |

## 🎯 What Gets Tested

1. ✅ Submit review → gain attack token
2. ✅ Multiple users can submit
3. ✅ Attack with shield → blocked
4. ✅ Attack without shield → token transfer
5. ✅ 10-second cooldown enforcement
6. ✅ Protection (0 tokens = not attackable)

## 📊 Output

- **Screenshots**: `e2e/screenshots/*.png` (20+)
- **Report**: `e2e/screenshots/report.html`
- **Failures**: `e2e/screenshots/FAIL-*.png`

## 🔧 Configuration

| Variable | Value |
|----------|-------|
| Project Code | `ABC123` |
| Test Users | `demoUser1`, `demoUser2` |
| Initial Tokens | 3 review, 0 attack, 1 shield |
| Cooldown | 10 seconds (instead of 2 min) |
| AI Mocking | ON (E2E_TEST=1) |

## 🐛 Troubleshooting

**Backend not responding:**
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/test/health
```

**Frontend not loading:**
```bash
curl http://localhost:5174
```

**Tests failing:**
```bash
# Run in debug mode to see browser
npm run e2e:debug

# Check failure screenshots
ls e2e/screenshots/FAIL-*.png

# Re-seed database
npm run e2e:seed
```

**Port conflicts:**
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5174 | xargs kill -9
```

## 📁 File Structure

```
e2e/
├── seed.mjs                 # Database seeding
├── game-attack.spec.mjs     # Puppeteer tests
├── run-tests.sh             # Test runner script
├── README.md                # Full documentation
└── screenshots/             # Output
    ├── *.png               # Screenshots
    └── report.html         # Generated report
```

## 🎨 Test Selectors

```javascript
// Tokens
[data-testid="my-review-tokens"]
[data-testid="my-attack-tokens"]
[data-testid="my-shield-tokens"]

// Buttons
[data-testid="submit-review-btn"]
[data-testid="attack-player-btn"]
[data-testid="attack-btn"]
[data-testid="use-shield-btn"]
[data-testid="dont-use-shield-btn"]

// Modals
[data-testid="target-list"]
[data-testid="target-row"]
[data-testid="pending-attack-modal"]

// Leaderboard
[data-testid="leaderboard-top-1-name"]
[data-testid="leaderboard-top-1-score"]
```

## 🔌 Test Endpoints

```javascript
POST /api/test/set-session
  { userName, projectCode }

POST /api/test/reset-tokens
  { userName, projectCode, reviewTokens, attackTokens, shieldTokens }

DELETE /api/test/clear-attacks
  { projectCode }

GET /api/test/health
```

## ⚡ One-Liner (if servers running)

```bash
npm run e2e:all && open e2e/screenshots/report.html
```

## 📚 Full Docs

- **Complete Guide**: `e2e/README.md`
- **Implementation Details**: `E2E_IMPLEMENTATION.md`
- **Interactive Script**: `./e2e/run-tests.sh`

---

**Need help?** Check screenshots in `e2e/screenshots/` or run `./e2e/run-tests.sh`
