# Agentic AI Learning Platform - Developer Onboarding

Version: 3.0 (Developer Edition)
Last Updated: March 2026
Audience: Engineers onboarding to this codebase (frontend, backend, deployment, debugging).

## 1. System Snapshot

Agentic AI Learning is a full-stack writing platform with:

- Student project access gated by student roster + project password
- AI review pipeline across 3 categories (content, structure, mechanics)
- Gamified token system (pass/review, attack, shield) with real-time WebSocket events
- Admin project lifecycle (create, edit, enable/disable, roster import/export, submission grading)
- Production session auth via PostgreSQL-backed cookies across different domains

Current production topology:

- Frontend hosted on Render
- Backend hosted on Ubuntu (PM2 + Nginx + HTTPS)
- PostgreSQL backing app data + session store

## 2. Repository Layout

Top-level:

- `backend/` Express + TypeScript API and AI orchestration
- `frontend/` React app (Vite)
- `e2e/` end-to-end scripts/specs

Key backend files:

- `backend/src/index.ts` server bootstrap, CORS, session cookies, route mounting
- `backend/src/routes/auth.ts` login/signup/me/logout
- `backend/src/routes/public.ts` student/project/review/submission APIs
- `backend/src/routes/game.ts` attack/defense/heartbeat/player state
- `backend/src/routes/admin.ts` project and grading APIs
- `backend/src/routes/feedback.ts` anonymous student feedback APIs
- `backend/src/sdk/reviewSdk.ts` multi-agent grading workflow
- `backend/src/db/schema.sql` base schema

Key frontend files:

- `frontend/src/App.tsx` route graph and protected routes
- `frontend/src/pages/ProjectPage.jsx` primary student UX and button state logic
- `frontend/src/pages/LoginPage.jsx` admin login/signup
- `frontend/src/pages/admin/*` admin dashboard + project tooling + grading pages
- `frontend/src/api/client.js` API wrapper (`credentials: include`)
- `frontend/src/api/endpoints.js` endpoint map
- `frontend/src/hooks/useWebSocket.js` real-time game channel logic

## 3. Local Dev Quickstart

### 3.1 Prerequisites

- Node 20.x (recommended for parity with server)
- npm
- PostgreSQL instance

### 3.2 Install

From repo root:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3.3 Environment Files

Backend `.env` minimum:

- `DATABASE_URL`
- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`

Frontend `.env` minimum:

- `VITE_API_BASE`

### 3.4 Run

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Build checks:

```bash
cd backend && npm run build
cd frontend && npm run build
```

## 4. Runtime Architecture

### 4.1 Request Plane

Frontend requests flow through `apiFetch()` in `frontend/src/api/client.js`:

- Adds `Content-Type: application/json`
- Sets `credentials: 'include'` so session cookies are sent
- Wraps failures with structured `APIError`

Backend route mounting in `backend/src/index.ts`:

- `/api/auth`
- `/api/public`
- `/api/admin`
- `/api/game`
- `/api/test` (conditional features use env)
- `/api/public` also mounts feedback routes

### 4.2 Session and Cookies

Session stack:

- `express-session`
- `connect-pg-simple` store
- DB table: `session`

Cookie behavior (production-safe defaults):

- `sameSite: none` in production
- `secure: true` in production
- `httpOnly: true`
- optional custom `domain` and cookie `name`

Critical auth reliability detail:

- In `backend/src/routes/auth.ts`, login and signup call `req.session.save(...)` before sending success response.
- This avoids race conditions where next request arrives before session persistence completes.

### 4.3 CORS

Allowed origins are computed from:

- `FRONTEND_URL`
- optional comma-separated `FRONTEND_URLS`

`credentials: true` is enabled and required for cross-site cookies.

## 5. Frontend Route Contracts

Routes in `frontend/src/App.tsx`:

- `/` Home page project code entry
- `/projects/:code` student project workflow
- `/login` admin login/signup
- `/admin` and all `/admin/*` routes protected by `ProtectedRoute`

`ProtectedRoute` behavior:

- waits while auth bootstrap is in progress
- redirects unauthenticated users to `/login`

## 6. Student UX Logic (ProjectPage)

Source: `frontend/src/pages/ProjectPage.jsx`

### 6.1 Access Gate

Student must pass:

- student ID
- project password

Action:

- `POST /api/public/projects/:code/validate-student`

State persisted in local storage:

- student ID
- student name
- per-student essay draft

### 6.2 Essay Editor and Limits

- Draft autosaved per project/student key
- Word count tracked live
- Over-limit blocks review/final submit actions
- Final-submitted users get locked textarea

### 6.3 Review Button (`Use Pass to Review`)

Endpoint:

- `POST /api/public/projects/:code/reviews`

Disabled conditions:

- loading
- empty essay
- over word limit
- project disabled
- cooldown active
- no review tokens
- attempts remaining exhausted

Success effects:

- token state refresh
- cooldown starts
- review history refresh
- leaderboard refresh trigger
- final score recalculated from category scores when available

### 6.4 Attack/Defense Loop

Attack flow:

- open `AttackModal`
- fetch targets from `GET /api/game/projects/:code/active-players`
- launch `POST /api/game/projects/:code/attack`

Defense flow:

- WebSocket `incoming_attack` opens `DefenseModal`
- defend endpoint `POST /api/game/projects/:code/defend`
- 15-second timer auto-resolves if user does nothing

### 6.5 Final Submission

Endpoint:

- `POST /api/public/projects/:code/submissions/final`

Behavior:

- confirmation prompt
- locks future edits/reviews
- optional post-submit feedback modal if project has feedback enabled

### 6.6 Feedback Modal

Endpoint:

- `POST /api/public/:code/feedback/submit`

Validation:

- all three ratings required
- optional comment max 200 words

## 7. Admin UX Logic

### 7.1 Login/Signup

Page: `frontend/src/pages/LoginPage.jsx`

Actions:

- login: `POST /api/auth/admin/login`
- signup: `POST /api/auth/admin/signup`
- bootstrap check: `GET /api/auth/me`
- logout: `POST /api/auth/logout`

### 7.2 Admin Dashboard

Page: `frontend/src/pages/admin/AdminDashboard.jsx`

Capabilities:

- list projects
- multi-select delete
- enable/disable toggle
- navigate to submissions/edit

### 7.3 Create/Edit Project

Pages:

- `CreateProject.jsx`
- `EditProject.jsx`

Configurable project fields:

- code, title, description, password, youtube URL
- word limit
- attempts per category
- review cooldown
- enable feedback
- test mode

Roster support:

- import CSV/XLSX/XLS
- export roster CSV/Excel/PDF (edit screen)

### 7.4 Submissions and Grading

Pages:

- `SubmissionsList.jsx`
- `SubmissionDetail.jsx`

Features:

- sort submissions by time/score state
- inspect full essay + category review history
- autosave grading (debounced)
- manual save action

### 7.5 Feedback Analytics

Page: `ProjectFeedback.jsx`

Provides:

- aggregate averages and response counts
- per-response detail
- sorting by recency and ratings

## 8. Real-Time Layer (WebSocket)

Client hook: `frontend/src/hooks/useWebSocket.js`

Connection strategy:

- derives ws URL from `VITE_API_BASE` for production
- reconnects automatically after disconnect (3s)
- sends heartbeat every 25s

Handled message types:

- `registered`
- `incoming_attack`
- `attack_result`
- `token_update`
- `heartbeat_ack`

## 9. AI Review Pipeline (Backend)

Source: `backend/src/sdk/reviewSdk.ts`

`runWorkflow()` stages:

1. Guardrail agent validates request type
2. Parser agent extracts previous/current essay segments
3. Content grader produces score + strengths/improvements/suggestions
4. Structure grader does same for narrative structure
5. Mechanics grader does same for language mechanics
6. Final score agent computes weighted integer score
7. Integrator normalizes outputs into final `details` payload

Returned contract:

- `final_score`
- `details.content`
- `details.structure`
- `details.mechanics`

## 10. API Contract Map

Auth:

- `GET /api/auth/me`
- `POST /api/auth/admin/login`
- `POST /api/auth/admin/signup`
- `POST /api/auth/logout`

Public:

- `GET /api/public/projects/:code`
- `POST /api/public/projects/:code/validate-student`
- `GET /api/public/projects/:code/user-state`
- `POST /api/public/projects/:code/reviews`
- `POST /api/public/projects/:code/submissions/final`
- `GET /api/public/projects/:code/leaderboard`
- `POST /api/public/:code/feedback/check`
- `POST /api/public/:code/feedback/submit`

Game:

- `POST /api/game/projects/:code/player/init`
- `POST /api/game/projects/:code/heartbeat`
- `GET /api/game/projects/:code/active-players`
- `POST /api/game/projects/:code/attack`
- `POST /api/game/projects/:code/defend`

Admin:

- `GET /api/admin/projects`
- `GET /api/admin/projects/:code`
- `POST /api/admin/projects`
- `PUT /api/admin/projects/:code`
- `PATCH /api/admin/projects/:code/status`
- `DELETE /api/admin/projects`
- `POST /api/admin/projects/:code/students/import`
- `GET /api/admin/projects/:code/students`
- `GET /api/admin/projects/:code/submissions`
- `GET /api/admin/submissions/:submissionId`
- `PATCH /api/admin/submissions/:submissionId/grading`
- `GET /api/admin/projects/:code/feedback`

## 11. Database Tables Used by Active Features

Core tables:

- `projects`
- `project_students`
- `submissions`
- `review_attempts`
- `player_state`
- `attacks`
- `active_sessions`
- `project_feedback`
- `admin_users`
- `session`

## 12. Production Deployment Runbook (Ubuntu)

Deploy newest commit:

```bash
ssh -i <pem> ubuntu@<server-ip>
cd /home/ubuntu/AgenticAILearningApplication
git pull origin main
cd backend
npm run build
pm2 restart AgenticAILearningApplication --update-env
pm2 status
```

Health checks:

```bash
curl -s https://agenticailearning.duckdns.org/api/health
ssh -i <pem> ubuntu@<server-ip> "pm2 status"
```

Expected health response:

- HTTP 200 with `{ "status": "ok", ... }`

## 13. Environment Variables

Backend required:

- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_SIGNUP_CODE`
- `SUPER_ADMIN_CODE`
- `OPENAI_API_KEY`
- `GPTZERO_API_KEY`
- `ENCRYPTION_KEY`
- `PORT`
- `NODE_ENV`
- `FRONTEND_URL`

Backend optional:

- `FRONTEND_URLS`
- `SESSION_COOKIE_SAMESITE`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_DOMAIN`
- `SESSION_COOKIE_NAME`

Frontend required:

- `VITE_API_BASE`

## 14. Common Failures and Fast Debugging

### 14.1 401 Admin Authentication Required After Login

Check:

- cookie settings and CORS origin match
- `req.session.save(...)` still present in `auth.ts`
- frontend requests still send `credentials: include`

Commands:

```bash
ssh -i <pem> ubuntu@<server-ip> "pm2 logs AgenticAILearningApplication --lines 100"
```

### 14.2 ENCRYPTION_KEY Not Set

Symptoms:

- project create/update path returns 500 from crypto utilities

Fix:

- ensure backend `.env` on server has `ENCRYPTION_KEY`
- restart PM2 with `--update-env`

### 14.3 CORS Randomly Fails Across Domains

Fix:

- set both `FRONTEND_URL` and `FRONTEND_URLS` (comma-separated variants)
- verify exact protocol/hostname match

### 14.4 Session Works Locally but Not in Production

Fix:

- enforce HTTPS
- production `sameSite=none`, `secure=true`
- `app.set('trust proxy', 1)` must remain enabled

## 15. Regression Checklist Before Release

- backend build passes (`npm run build`)
- frontend build passes (`npm run build`)
- `/api/health` returns 200 in production
- admin login persists across page refresh
- student review/attack/defense flows all work
- final submission lock behavior still enforced
- feedback modal submits successfully when enabled
- PM2 process online with no crash loop
