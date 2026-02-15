# Agentic AI Learning Platform - Complete Documentation

**Version:** 1.0.0  
**Last Updated:** February 14, 2026  
**Purpose:** Educational platform combining AI-powered essay feedback with gamified peer interactions

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [Backend Deep Dive](#backend-deep-dive)
7. [Frontend Deep Dive](#frontend-deep-dive)
8. [API Documentation](#api-documentation)
9. [Game Mechanics](#game-mechanics)
10. [WebSocket System](#websocket-system)
11. [AI/LLM Integration](#aillm-integration)
12. [User Flows](#user-flows)
13. [Setup & Installation](#setup--installation)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Guide](#deployment-guide)
16. [Troubleshooting](#troubleshooting)
17. [Known Limitations](#known-limitations)
18. [Future Improvements](#future-improvements)

---

## 1. Project Overview

### Purpose
An educational platform where students:
- Submit essays for AI-powered feedback across three categories: **Content**, **Structure**, and **Mechanics**
- Receive detailed reviews with scores, good points, areas to improve, and specific suggestions
- Engage in a gamified system using tokens (review, attack, shield)
- Compete on a leaderboard based on essay scores
- Submit final essays for admin review and grading

### Key Features

#### Core Essay System
- Multi-attempt review system (configurable per project)
- Three-category analysis: Content, Structure, Mechanics
- Real-time AI feedback with scoring (0-100)
- Essay word limit enforcement
- Review cooldown system (prevents spam)
- Final submission lock (one-time only)

#### Gamification System
- **Review Tokens**: Required to request AI feedback, earn attack tokens
- **Attack Tokens**: Used to "steal" review tokens from other players
- **Shield Tokens**: Defend against attacks
- Real-time player tracking (active sessions)
- Attack/Defend mechanics with 15-second timer
- WebSocket-based notifications

#### Admin Features
- Project creation and management
- Student submission viewing
- Manual scoring and feedback
- Leaderboard management

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Backend    │ ◄─────► │  Database   │
│  (React)    │  HTTP   │  (Express)   │   SQL   │ (PostgreSQL)│
│  + Vite     │  + WS   │  + WebSocket │         │   (Neon)    │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  OpenAI API  │
                        │  (GPT-4)     │
                        │  + Agents    │
                        └──────────────┘
```

### Component Layers

#### **Presentation Layer (Frontend)**
- React 18 with React Router v6
- Vite for build tooling
- Custom hooks for WebSocket connections
- Component-based UI with modals and real-time updates

#### **Application Layer (Backend)**
- Express.js REST API
- WebSocket server for real-time features
- Route-based organization (auth, public, game, admin, feedback)
- Middleware for authentication and error handling

#### **Business Logic Layer**
- Token management system
- Attack/Defense game logic
- Review attempt tracking and validation
- AI agent orchestration

#### **Data Layer**
- PostgreSQL via `pg` driver
- Connection pooling
- Transaction support for atomic operations
- Normalized data structure

#### **External Services**
- OpenAI API for AI-powered reviews
- OpenAI Agents SDK for structured responses
- OpenAI Guardrails for content safety

---

## 3. Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18.20.8 | Runtime environment |
| **TypeScript** | 5.3.3 | Type-safe development |
| **Express** | 4.18.2 | Web framework |
| **PostgreSQL** | Latest | Database (via Neon) |
| **pg** | 8.11.3 | PostgreSQL client |
| **ws** | 8.19.0 | WebSocket server |
| **tsx** | 4.7.0 | TypeScript execution |
| **OpenAI SDK** | 4.24.1 | AI integration |
| **@openai/agents** | 0.3.7 | Agent framework |
| **@openai/guardrails** | 0.2.1 | Content moderation |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI framework |
| **React Router** | 6.21.1 | Client-side routing |
| **TypeScript** | 5.3.3 | Type safety |
| **Vite** | 5.0.11 | Build tool & dev server |

### Development Tools

- **E2E Testing**: Playwright
- **Package Manager**: npm
- **Version Control**: Git
- **Node Version Manager**: nvm

---

## 4. Project Structure

### Root Directory
```
AgenticAILearning/
├── backend/              # Backend application
├── frontend/             # Frontend application
├── e2e/                  # End-to-end tests
├── node_modules/         # Root dependencies
├── package.json          # Root package config
├── dev.sh               # Development startup script
└── Documentation files  # Various .md files
```

### Backend Structure
```
backend/
├── src/
│   ├── index.ts                # Main entry point
│   ├── types.ts               # TypeScript types
│   ├── websocket.ts           # WebSocket setup
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   ├── schema.sql        # Database schema
│   │   ├── migrate.ts        # Migration runner
│   │   └── migrate-*.ts      # Feature migrations
│   ├── routes/
│   │   ├── public.ts         # Public API (no auth)
│   │   ├── game.ts           # Game mechanics API
│   │   ├── admin.ts          # Admin-only routes
│   │   ├── auth.ts           # Authentication
│   │   ├── feedback.ts       # Feedback system
│   │   └── test.ts           # Testing utilities
│   ├── services/
│   │   ├── auth.ts           # Auth service
│   │   └── sdks/            # Individual AI agents
│   │       ├── content.ts
│   │       ├── structure.ts
│   │       └── grammar.ts
│   ├── sdk/
│   │   └── reviewSdk.ts      # Main review workflow
│   ├── middleware/           # Express middleware
│   └── config/              # Configuration files (currently empty)
├── package.json
└── tsconfig.json
```

### Frontend Structure
```
frontend/
├── src/
│   ├── main.jsx             # Application entry
│   ├── App.tsx              # Root component
│   ├── index.css            # Global styles
│   ├── types.ts             # TypeScript types
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── HelpPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── ProjectPage.jsx  # Main project page
│   │   └── admin/
│   │       ├── AdminDashboard.jsx
│   │       ├── CreateProject.jsx
│   │       ├── EditProject.jsx
│   │       ├── ProjectFeedback.jsx
│   │       ├── SubmissionsList.jsx
│   │       └── SubmissionDetail.jsx
│   ├── components/
│   │   ├── ReviewLoadingAnimation.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── TokenDisplay.jsx
│   │   ├── TokenIcons.jsx
│   │   ├── AttackModal.jsx
│   │   ├── DefenseModal.jsx
│   │   ├── FeedbackModal.jsx
│   │   ├── Navigation.jsx
│   │   └── PageContainer.jsx
│   ├── api/
│   │   ├── client.js
│   │   └── endpoints.js      # API client
│   ├── hooks/
│   │   └── useWebSocket.js   # WebSocket hook
│   └── store/
│       └── AuthContext.jsx
├── package.json
├── vite.config.ts
└── vite-env.d.ts
```

---

## 5. Database Schema

### Entity Relationship Overview

```
admin_users (1) ─────┐
                     │
                     │ created_by
                     ▼
                  projects (1)
                     │
            ┌────────┼────────┬─────────┬─────────┐
            │        │        │         │         │
         (N)│     (N)│     (N)│      (N)│      (N)│
            ▼        ▼        ▼         ▼         ▼
    submissions  review_  player_  active_   attacks
                attempts  state    sessions
```

### Core Tables

#### **admin_users**
Stores administrator accounts for project management.

```sql
Columns:
- id (UUID, PK): Unique identifier
- username (TEXT, UNIQUE): Login username
- password_hash (TEXT): Bcrypt hashed password
- is_super_admin (BOOLEAN): Super admin flag
- created_at (TIMESTAMPTZ): Creation timestamp
```

#### **projects**
Defines essay projects with configuration.

```sql
Columns:
- code (CHAR(6), PK): Unique project code (e.g., "ABC123")
- title (TEXT): Project title
- description (TEXT): Project description
- youtube_url (TEXT): Optional instructional video
- word_limit (INTEGER): Maximum essay words (default: 150)
- attempt_limit_per_category (INTEGER): Review attempts (default: 3)
- review_cooldown_seconds (INTEGER): Cooldown between reviews
- enable_feedback (BOOLEAN): Enable feedback feature
- created_by_admin_id (UUID, FK): Creator admin
- created_at, updated_at (TIMESTAMPTZ): Audit timestamps
```

#### **submissions**
Stores final essay submissions (one per user per project).

```sql
Columns:
- id (UUID, PK): Unique identifier
- project_code (CHAR(6), FK): Related project
- user_name (TEXT): Student display name
- user_name_norm (TEXT): Normalized name (lowercase, trimmed)
- essay (TEXT): Final submitted essay
- submitted_at (TIMESTAMPTZ): Submission time
- admin_score (INTEGER): Admin-assigned score
- admin_feedback (TEXT): Admin feedback
- updated_at (TIMESTAMPTZ): Last update

Constraints:
- UNIQUE(project_code, user_name_norm): One submission per user
```

#### **review_attempts**
Tracks each AI review request with results.

```sql
Columns:
- id (UUID, PK): Unique identifier
- project_code (CHAR(6), FK): Related project
- user_name (TEXT): Student display name
- user_name_norm (TEXT): Normalized name
- category (TEXT): 'content' | 'structure' | 'mechanics'
- attempt_number (INTEGER): Sequential attempt number
- essay_snapshot (TEXT): Essay version at review time
- status (TEXT): 'success' | 'error'
- score (NUMERIC): Category score (0-100)
- final_score (NUMERIC): Overall score (across all categories)
- result_json (JSONB): Detailed review data
- error_message (TEXT): Error details if failed
- created_at (TIMESTAMPTZ): Review timestamp
- submission_id (UUID, FK, NULL): Linked final submission

Constraints:
- UNIQUE(project_code, user_name_norm, category, attempt_number)

result_json Structure:
{
  "score": 85,
  "overview": {
    "good": ["point 1", "point 2"],
    "improve": ["issue 1", "issue 2"]
  },
  "suggestions": ["suggestion 1", "suggestion 2"]
}
```

#### **player_state**
Manages game tokens for each player.

```sql
Columns:
- id (UUID, PK): Unique identifier
- project_code (CHAR(6), FK): Related project
- user_name (TEXT): Player display name
- user_name_norm (TEXT): Normalized name
- review_tokens (INTEGER): Tokens to request reviews (default: project limit)
- attack_tokens (INTEGER): Tokens to attack others (default: 0, max: 1)
- shield_tokens (INTEGER): Tokens to defend (default: 1)
- last_review_at (TIMESTAMPTZ): Last review request time
- created_at, updated_at (TIMESTAMPTZ): Timestamps

Constraints:
- UNIQUE(project_code, user_name_norm)

Token Flow:
- Submit review: -1 review_token, +1 attack_token (capped at 1)
- Successful attack: Attacker +1 review_token, Target -1 review_token
- Use shield: -1 shield_token, attack blocked
```

#### **active_sessions**
Tracks currently active players for real-time features.

```sql
Columns:
- id (UUID, PK): Unique identifier
- project_code (CHAR(6), FK): Related project
- user_name (TEXT): Player name
- user_name_norm (TEXT): Normalized name
- session_id (TEXT, UNIQUE): Browser session ID
- last_seen (TIMESTAMPTZ): Last heartbeat time
- created_at (TIMESTAMPTZ): Session start

Constraints:
- UNIQUE(project_code, user_name_norm)

Usage:
- Updated every 30 seconds via heartbeat
- Stale sessions (>2 minutes) excluded from active player list
```

#### **attacks**
Records attack transactions in the game.

```sql
Columns:
- id (UUID, PK): Unique identifier
- project_code (CHAR(6), FK): Related project
- attacker_name (TEXT): Attacking player
- attacker_name_norm (TEXT): Normalized name
- target_name (TEXT): Defending player
- target_name_norm (TEXT): Normalized name
- status (TEXT): 'pending' | 'defended' | 'succeeded' | 'expired'
- shield_used (BOOLEAN): Whether target used shield
- created_at (TIMESTAMPTZ): Attack initiation
- responded_at (TIMESTAMPTZ): Response time
- expires_at (TIMESTAMPTZ): Auto-resolve time (15 seconds)

Constraints:
- UNIQUE(project_code, attacker_name_norm, target_name_norm): One attack per pair

Attack States:
- pending: Waiting for defender response (15s timer)
- defended: Target used shield, attack blocked
- succeeded: Target accepted loss or timed out
- expired: Auto-resolved due to timeout
```

### Session Table (Express)
```sql
session:
- sid (VARCHAR, PK): Session ID
- sess (JSON): Session data
- expire (TIMESTAMP): Expiration time
```

---

## 6. Backend Deep Dive

### Main Entry Point (`index.ts`)

```typescript
// Key responsibilities:
1. Environment variable loading (.env)
2. Express server setup
3. CORS configuration
4. Session management (PostgreSQL-backed)
5. WebSocket server initialization
6. Route registration
7. Error handling middleware
8. Server startup (port 3000)
```

**Server Configuration:**
```typescript
- CORS: Credentials enabled, origin from env
- Sessions: 
  - PostgreSQL store (connect-pg-simple)
  - 24-hour expiration
  - Secure cookies in production
- Body parsing: JSON, URL-encoded
- Static files: Serve admin panel
```

### Database Module (`db/index.ts`)

```typescript
// Connection pool setup
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Utility functions
export function normalizeProjectCode(code: string): string {
  return code.toUpperCase().trim();
}

export function normalizeUserName(name: string): string {
  return name.toLowerCase().trim();
}
```

**Purpose of Normalization:**
- `normalizeProjectCode`: Ensures case-insensitive project lookups
- `normalizeUserName`: Prevents duplicate users with different casing

### Route Organization

#### **Public Routes** (`routes/public.ts`)
No authentication required. Student-facing endpoints.

**Endpoints:**
1. `GET /api/public/projects/:code` - Get project info
2. `GET /api/public/projects/:code/user-state` - Get user review state
3. `POST /api/public/projects/:code/reviews` - Submit for AI review
4. `POST /api/public/projects/:code/submissions/final` - Submit final essay
5. `GET /api/public/projects/:code/leaderboard` - Get top 3 scores

**Key Logic - Review Submission:**
```typescript
1. Validate user hasn't submitted final essay
2. Check review tokens available (player_state.review_tokens > 0)
3. Check cooldown period (last_review_at + cooldown)
4. Validate essay not over word limit
5. Call AI agent workflow (reviewSdk.runWorkflow)
6. Save three review attempts (one per category)
7. Update player_state:
   - Decrement review_tokens
   - Increment attack_tokens (max 1)
   - Update last_review_at
8. Return reviews + final score + updated tokens
```

#### **Game Routes** (`routes/game.ts`)
Game mechanics for token system and attacks.

**Endpoints:**
1. `POST /game/projects/:code/player/init` - Initialize player state
2. `POST /game/projects/:code/heartbeat` - Update active session
3. `GET /game/projects/:code/active-players` - List online players
4. `POST /game/projects/:code/attack` - Initiate attack
5. `POST /game/projects/:code/defend` - Respond to attack

**Attack Flow (Detailed):**
```typescript
// 1. Attack Initiation
POST /attack {attackerName, targetName}
  ├─ BEGIN TRANSACTION
  ├─ Validate attacker has attack_tokens >= 1
  ├─ Validate target has review_tokens >= 1
  ├─ Check no existing attack (attacker → target)
  ├─ Deduct 1 attack_token from attacker
  ├─ Create attack record (status='pending', expires in 15s)
  ├─ COMMIT TRANSACTION
  ├─ Send WebSocket notification to target
  ├─ Schedule autoResolveAttack after 15 seconds
  └─ Return {attackId, tokens: updated_attacker_tokens}

// 2. Defense Response (within 15s)
POST /defend {attackId, useShield: true|false}
  ├─ BEGIN TRANSACTION
  ├─ Validate attack exists and status='pending'
  ├─ IF useShield:
  │   ├─ Check target has shield_tokens >= 1
  │   ├─ Deduct 1 shield_token
  │   ├─ Update attack (status='defended', shield_used=true)
  │   └─ Notify attacker (failure)
  ├─ ELSE (accept):
  │   ├─ Target: -1 review_token
  │   ├─ Attacker: +1 review_token (max 3)
  │   ├─ Update attack (status='succeeded')
  │   ├─ Notify attacker (success)
  │   └─ Broadcast token updates via WebSocket
  └─ COMMIT TRANSACTION

// 3. Auto-resolve (15s timeout)
function autoResolveAttack()
  ├─ Check attack still pending
  ├─ Target: -1 review_token
  ├─ Attacker: +1 review_token (max 3)
  ├─ Update attack (status='expired')
  └─ Broadcast token updates
```

#### **Admin Routes** (`routes/admin.ts`)
Protected by session authentication.

**Endpoints:**
1. `POST /admin/projects` - Create project
2. `GET /admin/projects` - List all projects
3. `GET /admin/projects/:code/submissions` - List submissions
4. `GET /admin/projects/:code/submissions/:id` - Get submission detail
5. `PATCH /admin/projects/:code/submissions/:id/score` - Update score
6. `DELETE /admin/projects/:code` - Delete project

#### **Auth Routes** (`routes/auth.ts`)
Admin authentication.

**Endpoints:**
1. `POST /auth/admin/signup` - Admin signup (requires access code)
2. `POST /auth/admin/login` - Admin login
3. `POST /auth/logout` - Admin logout
4. `GET /auth/me` - Check auth status

#### **Feedback Routes** (`routes/feedback.ts`)
AI-powered feedback between students.

**Endpoints:**
1. `POST /feedback/projects/:code/request` - Request peer feedback
2. `GET /feedback/projects/:code/requests` - List feedback requests
3. `GET /feedback/projects/:code/received` - Get received feedback

#### **Test Routes** (`routes/test.ts`)
Development and E2E testing utilities.

**Endpoints:**
1. `POST /test/reset-tokens` - Reset player tokens (E2E_TEST mode only)
2. `POST /test/create-project` - Create test project
3. `GET /health` - Health check

---

## 7. Frontend Deep Dive

### Application Structure

#### **Main Entry (`main.jsx`)**
```tsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

#### **Root Component (`App.tsx`)**
Defines routing structure:

```tsx
Routes:
├─ / → HomePage
├─ /projects/:code → ProjectPage (main student interface)
├─ /login → LoginPage
├─ /help → HelpPage
├─ /admin → AdminDashboard
├─ /admin/projects/new → CreateProject
├─ /admin/projects/:code/edit → EditProject
├─ /admin/projects/:code/feedback → ProjectFeedback
├─ /admin/projects/:code/submissions/:submissionId → SubmissionDetail
└─ /admin/projects/:code → SubmissionsList
```

### Key Pages

#### **ProjectPage.jsx** (Main Student Interface)
**State Management:**
```javascript
// Core state
- project: Project configuration
- userName: Student name
- essay: Current essay text
- userState: Review history & attempts remaining
- finalScore: Overall score from AI

// Game state
- tokens: {reviewTokens, attackTokens, shieldTokens}
- sessionId: Unique browser session
- showAttackModal: Attack UI visibility
- incomingAttackId: Pending attack notification
- cooldownRemaining: Time until next review

// UI state
- activeTab: Selected review category
- loading, error, reviewLoading, submitLoading
```

**Component Lifecycle:**
```javascript
1. Mount:
   - Load saved userName & essay from localStorage
   - Fetch project info
   - If userName exists, initialize player state

2. User enters name:
   - Save to localStorage
   - Load user state (review history)
   - Initialize player tokens
   - Connect WebSocket

3. User types essay:
   - Save to localStorage on every change
   - Show word count vs limit

4. Review submission:
   - Show loading animation
   - POST to /reviews endpoint
   - Update tokens immediately
   - Refresh user state (attempts remaining)
   - Display results in tabs

5. Attack mechanics:
   - Heartbeat every 30s (mark active)
   - WebSocket notifications for attacks
   - Defense modal auto-appears
   - Token updates broadcast

6. Final submission:
   - Confirmation prompt
   - Submit essay (one-time only)
   - Disable further edits
```

**Key Handlers:**
```javascript
handleRunReview():
  - Validate essay, word count, tokens, cooldown
  - Submit to AI for review
  - Parse results into three categories
  - Update UI with scores and suggestions

handleFinalSubmit():
  - Confirm with user
  - POST final essay
  - Lock editing

handleAttackInitiated(result):
  - Update attack_tokens immediately
  - Reload user state
  - Show waiting indicator

handleDefenseResponse(result):
  - Update tokens
  - Close defense modal
  - Refresh player state
```

#### **AdminDashboard.jsx**
Admin project management interface.
- List all projects
- Create new project
- Delete projects
- Navigate to submissions

#### **SubmissionsList.jsx**
View all student submissions for a project.
- Filter/search submissions
- View individual submission detail
- Assign scores

#### **SubmissionDetail.jsx**
Detailed view of single submission.
- Display essay
- Show AI review history
- Admin scoring interface
- Admin feedback input

### Key Components

#### **AttackModal.jsx**
**Purpose:** Select target player and initiate attack.

**Features:**
- List active players (online within 2 minutes)
- Show each player's review_tokens and shield_tokens
- Disable attack if:
  - Already attacked this player
  - Player has no review_tokens
  - User has no attack_tokens
- Send attack via gameApi.attack()

**UI Flow:**
```
┌─────────────────────────────────────┐
│ ⚔️  Attack Another Player           │
├─────────────────────────────────────┤
│ Active Players:                     │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ Alice                           ││
│ │ 🔵 2 review tokens  🛡️ 1 shield ││
│ │              [⚔️ Attack] ───────►││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ Bob (Already attacked)          ││
│ │ 🔵 3 review tokens  🛡️ 0 shield ││
│ │          [Already Attacked]     ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### **DefenseModal.jsx**
**Purpose:** Respond to incoming attack.

**Features:**
- 15-second countdown timer (circular progress)
- Two options:
  1. Use Shield (if available) - blocks attack
  2. Accept - lose 1 review_token
- Auto-accept if timeout
- Uses `useCallback` and `useRef` to prevent stale closures

**Countdown Animation:**
```typescript
// SVG circle with strokeDashoffset animation
<circle
  strokeDasharray="282.74"  // Full circumference
  strokeDashoffset={282.74 * (1 - timeLeft / 15)}
  // At 15s: offset=0 (full circle)
  // At 0s: offset=282.74 (empty)
/>
```

**UI Flow:**
```
┌─────────────────────────────────────┐
│ 🚨 Under Attack!         ⏱️ 12s     │
├─────────────────────────────────────┤
│ Someone is trying to steal one of   │
│ your review tokens!                 │
│                                     │
│ ┌─────────────────────────────────┐│
│ │  🛡️ Use Shield                   ││
│ │  Block this attack              ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │  Accept                         ││
│ │  Lose 1 review token            ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### **TokenDisplay.jsx**
Visual display of player tokens.

```jsx
┌─────────────────────────────────────┐
│  🔵 3          ⚔️ 1          🛡️ 0   │
│  Review      Attack       Shield   │
└─────────────────────────────────────┘
```

#### **Leaderboard.jsx**
Top 3 players by score.

```jsx
┌─────────────────────────────────────┐
│ 🏆 Leaderboard                      │
├─────────────────────────────────────┤
│ 🥇 1. Alice ................... 95  │
│ 🥈 2. Bob ..................... 88  │
│ 🥉 3. Charlie ................. 82  │
└─────────────────────────────────────┘
```

#### **ReviewLoadingAnimation.jsx**
Engaging loading animation during AI review.

**Visual Elements:**
- Paper stack with shimmer effect
- Magnifying glass scanning animation
- "AI is reviewing your essay..." text

### Custom Hooks

#### **useWebSocket.js**
```javascript
useWebSocket(projectCode, userName, onAttack, onTokenUpdate, onAttackResult)

Features:
- Auto-connect when userName provided
- Reconnect on disconnect
- Event handlers:
  - 'attack-notification': Incoming attack
  - 'token-update': Token changes
  - 'attack-result': Attack outcome
- Cleanup on unmount
```

### API Client (`api/endpoints.js`)

```javascript
export const publicApi = {
  getProject(code),
  getUserState(code, userName),
  submitReview(code, userName, essay),
  submitFinalEssay(code, userName, essay)
};

export const gameApi = {
  initPlayer(code, userName),
  sendHeartbeat(code, userName, sessionId),
  getActivePlayers(code, userName),
  attack(code, attackerName, targetName),
  defend(code, attackId, useShield)
};

export const adminApi = {
  login(username, password),
  logout(),
  getProjects(),
  createProject(data),
  getSubmissions(code),
  updateScore(code, submissionId, score, feedback)
};
```

---

## 8. API Documentation

### Public Endpoints

#### Get Project Info
```http
GET /api/public/projects/:code

Response 200:
{
  "code": "ABC123",
  "title": "Argumentative Essay",
  "description": "Write a 150-word essay...",
  "youtube_url": "https://youtube.com/watch?v=...",
  "word_limit": 150,
  "attempt_limit_per_category": 3,
  "enable_feedback": true,
  "review_cooldown_seconds": 120
}

Response 404:
{
  "error": "Project not found"
}
```

#### Get User State
```http
GET /api/public/projects/:code/user-state?userName=Alice

Response 200:
{
  "alreadySubmitted": false,
  "attemptsRemaining": 3,
  "reviewHistory": {
    "content": [
      {
        "id": "uuid",
        "category": "content",
        "attempt_number": 1,
        "status": "success",
        "score": 85,
        "result_json": {
          "score": 85,
          "overview": {
            "good": ["Strong thesis"],
            "improve": ["Add more evidence"]
          },
          "suggestions": ["Cite sources in paragraph 2"]
        },
        "created_at": "2026-02-09T10:30:00Z"
      }
    ],
    "structure": [...],
    "mechanics": [...]
  }
}
```

#### Submit for Review
```http
POST /api/public/projects/:code/reviews
Content-Type: application/json

Request:
{
  "userName": "Alice",
  "essay": "This is my essay about..."
}

Response 200:
{
  "reviews": [
    {
      "id": "uuid",
      "category": "content",
      "attempt_number": 2,
      "status": "success",
      "score": 88,
      "result_json": {...},
      "created_at": "2026-02-09T11:00:00Z"
    },
    // structure and mechanics reviews...
  ],
  "finalScore": 87,
  "attemptsRemaining": 2,
  "tokens": {
    "review_tokens": 2,
    "attack_tokens": 1,
    "shield_tokens": 1
  },
  "cooldownMs": 120000
}

Response 403 (No Tokens):
{
  "error": "No review tokens available",
  "reviewTokens": 0
}

Response 429 (Cooldown):
{
  "error": "Please wait 45 seconds before submitting another review",
  "cooldownRemaining": 45000
}
```

#### Submit Final Essay
```http
POST /api/public/projects/:code/submissions/final

Request:
{
  "userName": "Alice",
  "essay": "My final essay..."
}

Response 200:
{
  "success": true,
  "submissionId": "uuid",
  "submittedAt": "2026-02-09T12:00:00Z"
}

Response 409:
{
  "error": "You have already submitted your final essay"
}
```

#### Get Leaderboard
```http
GET /api/public/projects/:code/leaderboard

Response 200:
[
  {
    "rank": 1,
    "userName": "Alice",
    "score": 95
  },
  {
    "rank": 2,
    "userName": "Bob",
    "score": 88
  },
  {
    "rank": 3,
    "userName": "Charlie",
    "score": 82
  }
]
```

### Game Endpoints

#### Initialize Player
```http
POST /api/game/projects/:code/player/init

Request:
{
  "userName": "Alice"
}

Response 200:
{
  "reviewTokens": 3,
  "attackTokens": 0,
  "shieldTokens": 1,
  "cooldownRemaining": 0
}
```

#### Send Heartbeat
```http
POST /api/game/projects/:code/heartbeat

Request:
{
  "userName": "Alice",
  "sessionId": "abc123"
}

Response 200:
{
  "success": true
}
```

#### Get Active Players
```http
GET /api/game/projects/:code/active-players?userName=Alice

Response 200:
[
  {
    "userName": "Bob",
    "reviewTokens": 3,
    "shieldTokens": 1,
    "canAttack": true
  },
  {
    "userName": "Charlie",
    "reviewTokens": 0,
    "shieldTokens": 0,
    "canAttack": false  // No tokens to steal
  }
]
```

#### Initiate Attack
```http
POST /api/game/projects/:code/attack

Request:
{
  "attackerName": "Alice",
  "targetName": "Bob"
}

Response 200:
{
  "success": true,
  "attackId": "uuid",
  "message": "Attack initiated, waiting for target response...",
  "tokens": {
    "review_tokens": 3,
    "attack_tokens": 0,
    "shield_tokens": 1
  }
}

Response 400 (No Attack Tokens):
{
  "error": "No attack tokens available"
}

Response 400 (Already Attacked):
{
  "error": "You have already attacked this player"
}
```

#### Defend Against Attack
```http
POST /api/game/projects/:code/defend

Request:
{
  "attackId": "uuid",
  "useShield": true  // or false to accept
}

Response 200 (Shield Used):
{
  "success": true,
  "defended": true,
  "tokens": {
    "review_tokens": 3,
    "attack_tokens": 0,
    "shield_tokens": 0
  }
}

Response 200 (Accepted):
{
  "success": true,
  "defended": false,
  "tokens": {
    "review_tokens": 2,  // Lost 1 token
    "attack_tokens": 0,
    "shield_tokens": 1
  }
}
```

### Admin Endpoints

#### Login
```http
POST /api/auth/admin/login

Request:
{
  "username": "admin",
  "password": "password123"
}

Response 200:
{
  "isAdmin": true,
  "adminName": "admin",
  "isSuperAdmin": true
}

Response 401:
{
  "error": "Invalid credentials"
}
```

#### Create Project
```http
POST /api/admin/projects
Authorization: Session cookie

Request:
{
  "code": "ABC123",
  "title": "Argumentative Essay",
  "description": "Write about...",
  "youtube_url": "https://...",
  "word_limit": 150,
  "attempt_limit_per_category": 3,
  "review_cooldown_seconds": 120,
  "enable_feedback": true
}

Response 200:
{
  "success": true,
  "project": { /* project data */ }
}

Response 409:
{
  "error": "Project code already exists"
}
```

#### List Submissions
```http
GET /api/admin/projects/:code/submissions

Response 200:
[
  {
    "id": "uuid",
    "user_name": "Alice",
    "essay": "My essay...",
    "submitted_at": "2026-02-09T12:00:00Z",
    "admin_score": 85,
    "admin_feedback": "Good work!",
    "highest_ai_score": 87
  },
  // ...more submissions
]
```

---

## 9. Game Mechanics

### Token System

#### **Token Types**

| Token | Symbol | Purpose | Initial | Max | Earn Method |
|-------|--------|---------|---------|-----|-------------|
| Review | 🔵 | Request AI feedback | Project limit | Project limit | Successful attacks |
| Attack | ⚔️ | Attack other players | 0 | 1 | Submit for review |
| Shield | 🛡️ | Defend against attacks | 1 | ∞ | (Future: purchase, rewards) |

#### **Token Flows**

**Scenario 1: Student submits essay for review**
```
Before:
  Review Tokens: 3
  Attack Tokens: 0

Submit for Review →

After:
  Review Tokens: 2  (-1)
  Attack Tokens: 1  (+1, capped at 1)
```

**Scenario 2: Attack Success (target accepts or timeout)**
```
Attacker Before:
  Review Tokens: 2
  Attack Tokens: 1

Target Before:
  Review Tokens: 3

Attack Target →

Attacker After:
  Review Tokens: 3  (+1, max 3)
  Attack Tokens: 0  (-1, spent on attack)

Target After:
  Review Tokens: 2  (-1, stolen)
```

**Scenario 3: Attack Blocked (target uses shield)**
```
Attacker Before:
  Attack Tokens: 1

Target Before:
  Shield Tokens: 1

Attack Target → Target Uses Shield →

Attacker After:
  Attack Tokens: 0  (-1, spent on attack)
  (No gain)

Target After:
  Shield Tokens: 0  (-1, spent on defense)
  (No loss of review tokens)
```

### Attack Mechanics (Detailed)

#### **Attack Lifecycle**

```
1. Attacker initiates
   ├─ POST /attack
   ├─ Deduct attack_token
   ├─ Create attack record (status='pending')
   └─ WebSocket notification to target

2. 15-second window
   ├─ Target sees DefenseModal
   ├─ Countdown timer visible
   └─ Target chooses:
       ├─ Use Shield (if available)
       ├─ Accept (lose review token)
       └─ Or wait for timeout

3. Resolution
   ├─ If shield used:
   │   ├─ Attack marked 'defended'
   │   ├─ Target -1 shield_token
   │   └─ Attacker gains nothing
   ├─ If accepted:
   │   ├─ Attack marked 'succeeded'
   │   ├─ Target -1 review_token
   │   └─ Attacker +1 review_token
   └─ If timeout:
       ├─ Auto-resolve (same as accept)
       ├─ Attack marked 'expired'
       └─ Tokens transferred

4. Notifications
   ├─ WebSocket to attacker (success/failure)
   └─ WebSocket token updates to both
```

#### **Attack Constraints**

1. **Can only attack once per target**
   - Tracked via `attacks` table UNIQUE constraint
   - `(project_code, attacker_name_norm, target_name_norm)`

2. **Can only attack players with review tokens**
   - Target must have `review_tokens >= 1`

3. **Must have attack token**
   - Attacker must have `attack_tokens >= 1`

4. **Cannot attack offline players**
   - Only active players shown (last_seen < 2 minutes)

### Strategic Gameplay

**Student Strategy:**
1. **Early Game**: Focus on improving essay, use all review tokens
2. **Mid Game**: Balance reviews vs saving tokens from attacks
3. **Shield Management**: Save shield for critical moments
4. **Attack Timing**: Attack players with high review tokens
5. **Active Presence**: Stay online to defend against attacks

**Resource Management:**
- Each review costs 1 review_token but grants 1 attack_token
- Successful attacks replenish review_tokens
- Shields are precious (limited supply)

---

## 10. WebSocket System

### Server Setup (`websocket.ts`)

```typescript
import { WebSocketServer } from 'ws';

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server });
  
  // Map: project_code → Map(userName → WebSocket)
  const connections = new Map<string, Map<string, WebSocket>>();
  
  wss.on('connection', (ws, req) => {
    const { projectCode, userName } = parseConnectionParams(req.url);
    
    // Store connection
    if (!connections.has(projectCode)) {
      connections.set(projectCode, new Map());
    }
    connections.get(projectCode).set(userName, ws);
    
    ws.on('close', () => {
      // Clean up connection
      connections.get(projectCode)?.delete(userName);
    });
  });
  
  return {
    sendAttackNotification(projectCode, targetName, attackId) {
      const ws = connections.get(projectCode)?.get(targetName);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'attack-notification',
          attackId
        }));
        return true;
      }
      return false;
    },
    
    sendAttackResult(projectCode, attackerName, result) {
      const ws = connections.get(projectCode)?.get(attackerName);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'attack-result',
          ...result
        }));
      }
    },
    
    broadcastTokenUpdate(projectCode, userName, tokens) {
      const ws = connections.get(projectCode)?.get(userName);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'token-update',
          review_tokens: tokens.review_tokens,
          attack_tokens: tokens.attack_tokens,
          shield_tokens: tokens.shield_tokens
        }));
      }
    }
  };
}
```

### Client Connection (`useWebSocket.js`)

```javascript
export function useWebSocket(projectCode, userName, onAttack, onTokenUpdate, onAttackResult) {
  useEffect(() => {
    if (!userName) return;
    
    const wsUrl = `ws://localhost:3000?projectCode=${projectCode}&userName=${userName}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'attack-notification':
          onAttack(data.attackId);
          break;
        case 'token-update':
          onTokenUpdate({
            review_tokens: data.review_tokens,
            attack_tokens: data.attack_tokens,
            shield_tokens: data.shield_tokens
          });
          break;
        case 'attack-result':
          onAttackResult({
            success: data.success,
            defended: data.defended,
            message: data.message
          });
          break;
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected, attempting reconnect...');
      // Could add auto-reconnect logic here
    };
    
    return () => ws.close();
  }, [projectCode, userName]);
}
```

### Message Types

#### 1. Attack Notification (Server → Target)
```json
{
  "type": "attack-notification",
  "attackId": "uuid-string"
}
```
**Triggers:** DefenseModal appears with 15s countdown

#### 2. Token Update (Server → Player)
```json
{
  "type": "token-update",
  "review_tokens": 2,
  "attack_tokens": 0,
  "shield_tokens": 1
}
```
**Triggers:** UI token display updates + user state refresh

#### 3. Attack Result (Server → Attacker)
```json
{
  "type": "attack-result",
  "success": true,
  "defended": false,
  "message": "Attack succeeded! You gained 1 review token."
}
```
**Triggers:** Success/failure notification to attacker

---

## 11. AI/LLM Integration

### Architecture

```
Student Essay
     ↓
reviewSdk.runWorkflow()
     ↓
┌────────────────────┐
│  OpenAI Agents     │
│  + Guardrails      │
└────────────────────┘
     ↓
Three Parallel Agents:
     ├─ Content Agent
     ├─ Structure Agent
     └─ Mechanics Agent
     ↓
Combined Results
     ↓
{
  final_score: 87,
  details: {
    content: {...},
    structure: {...},
    mechanics: {...}
  }
}
```

### Main Review Workflow (`sdk/reviewSdk.ts`)

```typescript
import { Agent, Runner } from '@openai/agents';
import { contentAgent } from '../services/sdks/content.js';
import { structureAgent } from '../services/sdks/structure.js';
import { grammarAgent } from '../services/sdks/grammar.js';

export async function runWorkflow(input: {input_as_text: string}) {
  const essay = input.input_as_text;
  
  // Parse previous and current essay
  const previousEssay = extractBetween(essay, '<<<PREVIOUS_START>>>', '<<<PREVIOUS_END>>>');
  const currentEssay = extractBetween(essay, '<<<CURRENT_START>>>', '<<<CURRENT_END>>>');
  
  // Run three agents in parallel
  const [contentResult, structureResult, mechanicsResult] = await Promise.all([
    contentAgent.run({ currentEssay, previousEssay }),
    structureAgent.run({ currentEssay, previousEssay }),
    grammarAgent.run({ currentEssay, previousEssay })
  ]);
  
  // Calculate final score (average of three categories)
  const finalScore = Math.round(
    (contentResult.score + structureResult.score + mechanicsResult.score) / 3
  );
  
  return {
    final_score: finalScore,
    details: {
      content: contentResult,
      structure: structureResult,
      mechanics: mechanicsResult
    }
  };
}
```

### Individual Agents

#### **Content Agent** (`services/sdks/content.ts`)

**Purpose:** Evaluate argument quality, evidence, and idea development.

```typescript
export const contentAgent = new Agent({
  name: 'content-evaluator',
  model: 'gpt-4',
  instructions: `
    You are an expert essay evaluator focusing on CONTENT.
    Evaluate the essay's ideas, arguments, evidence, and development.
    
    Scoring criteria:
    - 90-100: Exceptional ideas, strong evidence, excellent development
    - 80-89: Strong content with good support
    - 70-79: Adequate content, some weak areas
    - 60-69: Basic content, needs improvement
    - Below 60: Significant content issues
    
    Provide:
    1. Score (0-100)
    2. Overview good: List 2-3 strong points
    3. Overview improve: List 2-3 areas to improve
    4. Suggestions: List 2-3 specific actionable suggestions
  `,
  tools: [],
  responseSchema: {
    score: { type: 'number', min: 0, max: 100 },
    overview_good: { type: 'array', items: { type: 'string' } },
    overview_improve: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } }
  }
});
```

#### **Structure Agent** (`services/sdks/structure.ts`)

**Purpose:** Evaluate organization, flow, and logical coherence.

```typescript
export const structureAgent = new Agent({
  name: 'structure-evaluator',
  model: 'gpt-4',
  instructions: `
    You are an expert essay evaluator focusing on STRUCTURE.
    Evaluate organization, transitions, paragraph coherence, and flow.
    
    Scoring criteria:
    - 90-100: Excellent organization, smooth transitions
    - 80-89: Well-structured, good flow
    - 70-79: Adequate structure, minor issues
    - 60-69: Some organizational problems
    - Below 60: Poor structure, confusing flow
  `,
  // ... similar schema
});
```

#### **Mechanics Agent** (`services/sdks/grammar.ts`)

**Purpose:** Evaluate grammar, punctuation, spelling, and conventions.

```typescript
export const mechanicsAgent = new Agent({
  name: 'mechanics-evaluator',
  model: 'gpt-4',
  instructions: `
    You are an expert essay evaluator focusing on MECHANICS.
    Evaluate grammar, punctuation, spelling, sentence structure.
    
    Scoring criteria:
    - 90-100: Nearly flawless mechanics
    - 80-89: Few mechanical errors
    - 70-79: Some errors but readable
    - 60-69: Frequent errors
    - Below 60: Significant mechanical issues
  `,
  // ... similar schema
});
```

### Guardrails Integration

```typescript
import { Guardrail } from '@openai/guardrails';

// Applied to all agents automatically
const contentGuardrail = new Guardrail({
  rules: [
    {
      type: 'content-safety',
      action: 'block',
      message: 'Content violates safety guidelines'
    },
    {
      type: 'relevance',
      action: 'warn',
      message: 'Essay may not be relevant to prompt'
    }
  ]
});
```

### E2E Test Mode

When `process.env.E2E_TEST === '1'`, the system uses mock results instead of calling OpenAI:

```typescript
if (process.env.E2E_TEST === '1') {
  return {
    final_score: 88,
    details: {
      content: {
        score: 22,
        overview_good: ['Clear thesis', 'Strong evidence'],
        overview_improve: ['Expand counterarguments'],
        suggestions: ['Add examples in paragraph 3']
      },
      structure: {
        score: 22,
        overview_good: ['Logical flow', 'Good transitions'],
        overview_improve: ['Strengthen conclusion'],
        suggestions: ['Rework final paragraph']
      },
      mechanics: {
        score: 22,
        overview_good: ['Few errors', 'Proper citations'],
        overview_improve: ['Punctuation issues'],
        suggestions: ['Review comma usage']
      }
    }
  };
}
```

---

## 12. User Flows

### Flow 1: Student Essay Submission & Review

```
1. Student arrives at project page
   └─ URL: /projects/ABC123

2. Enter name
   ├─ Input: "Alice"
   ├─ Click "Continue"
   └─ System:
       ├─ Save name to localStorage
       ├─ Load user state (GET /user-state)
       ├─ Initialize player (POST /player/init)
       ├─ Connect WebSocket
       └─ Display: Tokens, essay textarea, leaderboard

3. Write essay
   ├─ Type in textarea
   ├─ Auto-save to localStorage
   ├─ Show word count (e.g., "145 / 150")
   └─ Enable "Submit for Review" when valid

4. Submit for Review
   ├─ Click "Submit for Review"
   ├─ Show loading animation (paper + magnifying glass)
   ├─ POST /reviews {userName: "Alice", essay: "..."}
   ├─ Backend:
   │   ├─ Check tokens (review_tokens >= 1)
   │   ├─ Check cooldown (last_review_at + 120s)
   │   ├─ Call AI agents (3 parallel)
   │   ├─ Save 3 review_attempts
   │   ├─ Update player_state:
   │   │   ├─ review_tokens: 3 → 2
   │   │   └─ attack_tokens: 0 → 1
   │   └─ Return results
   └─ Frontend:
       ├─ Hide loading animation
       ├─ Update tokens display
       ├─ Show final score (e.g., "87/100")
       ├─ Populate review tabs with feedback
       └─ Enable next review (after cooldown)

5. View feedback
   ├─ Click "Content" tab
   │   └─ Show: Score, Good Points, Improve, Suggestions
   ├─ Click "Structure" tab
   │   └─ Show feedback for structure
   └─ Click "Mechanics" tab
       └─ Show feedback for mechanics

6. Revise and resubmit
   ├─ Edit essay based on feedback
   ├─ Wait for cooldown (2 minutes)
   └─ Repeat steps 4-5 (up to 3 times total)

7. Final submission
   ├─ Click "Submit Final Essay"
   ├─ Confirm prompt
   ├─ POST /submissions/final
   ├─ Backend:
   │   └─ Insert into submissions table
   └─ Frontend:
       ├─ Disable textarea (read-only)
       ├─ Show "✓ Submitted" badge
       └─ Update leaderboard
```

### Flow 2: Attack Another Player

```
1. Earn attack token
   └─ Submit essay for review → +1 attack_token

2. Click "⚔️ Attack Another Player"
   └─ AttackModal opens

3. System fetches active players
   ├─ GET /active-players?userName=Alice
   └─ Returns:
       ├─ Bob: 3 review tokens, 1 shield, canAttack=true
       └─ Charlie: 0 review tokens, canAttack=false

4. Select target
   ├─ Click "⚔️ Attack" on Bob's row
   ├─ POST /attack {attackerName: "Alice", targetName: "Bob"}
   ├─ Backend:
   │   ├─ BEGIN TRANSACTION
   │   ├─ Alice: attack_tokens: 1 → 0
   │   ├─ Create attack record (status='pending', expires in 15s)
   │   ├─ COMMIT TRANSACTION
   │   ├─ WebSocket to Bob: {type: 'attack-notification', attackId}
   │   ├─ Schedule autoResolveAttack after 15s
   │   └─ Return {attackId, tokens: {attack_tokens: 0}}
   └─ Frontend:
       ├─ Update Alice's tokens display (0 attack tokens)
       ├─ Close AttackModal
       └─ Show "⏳ Waiting for result..."

5. Bob receives notification
   ├─ WebSocket message arrives
   └─ DefenseModal appears with 15s countdown
```

### Flow 3: Defend Against Attack

```
1. Bob sees DefenseModal
   ├─ "🚨 Under Attack!"
   ├─ Countdown: 15s → 14s → 13s...
   └─ Options:
       ├─ "🛡️ Use Shield" (if shield_tokens > 0)
       └─ "Accept" (lose review token)

2a. Bob uses shield
   ├─ Click "Use Shield"
   ├─ POST /defend {attackId, useShield: true}
   ├─ Backend:
   │   ├─ BEGIN TRANSACTION
   │   ├─ Bob: shield_tokens: 1 → 0
   │   ├─ Update attack (status='defended', shield_used=true)
   │   ├─ COMMIT TRANSACTION
   │   ├─ WebSocket to Alice: {type: 'attack-result', success: false}
   │   └─ Return {defended: true, tokens: {shield_tokens: 0}}
   └─ Frontend:
       ├─ Close DefenseModal
       ├─ Update Bob's tokens (0 shields)
       └─ Alice sees "Target used their shield! Attack blocked."

2b. Bob accepts
   ├─ Click "Accept"
   ├─ POST /defend {attackId, useShield: false}
   ├─ Backend:
   │   ├─ BEGIN TRANSACTION
   │   ├─ Bob: review_tokens: 3 → 2
   │   ├─ Alice: review_tokens: 2 → 3
   │   ├─ Update attack (status='succeeded')
   │   ├─ COMMIT TRANSACTION
   │   ├─ WebSocket to Alice: {type: 'attack-result', success: true}
   │   ├─ WebSocket to Bob: {type: 'token-update', review_tokens: 2}
   │   └─ WebSocket to Alice: {type: 'token-update', review_tokens: 3}
   └─ Frontend:
       ├─ Close DefenseModal
       ├─ Update both players' tokens
       └─ Alice sees "Attack succeeded! You gained 1 review token."

2c. Bob doesn't respond (timeout)
   ├─ Countdown reaches 0
   ├─ autoResolveAttack() triggered
   └─ Same as 2b (accept), but attack status='expired'
```

### Flow 4: Admin Grading

```
1. Admin logs in
  ├─ Navigate to /login
  ├─ POST /auth/admin/login {username, password}
  └─ Redirect to /admin

2. View submissions
   ├─ Select project from dashboard
   ├─ Navigate to /admin/projects/ABC123
   ├─ GET /admin/projects/ABC123/submissions
   └─ Display list:
       ├─ Alice - Submitted 2h ago - AI: 87
       ├─ Bob - Submitted 3h ago - AI: 92
       └─ Charlie - Submitted 1h ago - AI: 75

3. Grade submission
   ├─ Click on "Alice"
   ├─ Navigate to /admin/projects/ABC123/submissions/:id
   ├─ View:
   │   ├─ Essay text
   │   ├─ AI review history (all 3 attempts)
   │   └─ Scoring form
   ├─ Enter:
   │   ├─ Admin Score: 90
   │   └─ Admin Feedback: "Excellent work! Clear thesis..."
   ├─ Click "Save Score"
   ├─ PATCH /admin/projects/.../score
   └─ Update submission record in database
```

---

## 13. Setup & Installation

### Prerequisites

- **Node.js**: v18.20.8 (use nvm to manage versions)
- **PostgreSQL**: Database (recommend Neon.tech for cloud hosting)
- **OpenAI API Key**: For AI-powered reviews
- **Git**: For version control

### Environment Setup

#### 1. Install Node.js via nvm

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 18
nvm install 18.20.8
nvm use 18.20.8
```

#### 2. Clone Repository

```bash
git clone <repository-url>
cd AgenticAILearning
```

#### 3. Install Dependencies

```bash
# Root dependencies (for dev script)
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### Configuration

#### Backend Environment Variables

Create `backend/.env`:

```env
# Database (PostgreSQL via Neon)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# OpenAI API
OPENAI_API_KEY=sk-...

# Session Secret
SESSION_SECRET=your-random-secret-key-here

# CORS Origin (frontend URL)
CORS_ORIGIN=http://localhost:5173

# Environment
NODE_ENV=development

# Optional: E2E Testing
E2E_TEST=0
REVIEW_COOLDOWN_MS=120000  # 2 minutes in ms
```

#### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_BASE=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

### Database Setup

#### 1. Create Database

If using Neon.tech:
```bash
# Sign up at neon.tech
# Create new project
# Copy connection string to backend/.env
```

If using local PostgreSQL:
```bash
createdb agentic_ai_learning
# Update DATABASE_URL in backend/.env
```

#### 2. Run Migrations

```bash
cd backend
npm run db:migrate
```

This creates all tables:
- admin_users
- projects
- submissions
- review_attempts
- player_state
- active_sessions
- attacks
- session

#### 3. Create Admin User (Optional)

```bash
# Start backend
npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/auth/admin/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","accessCode":"your-access-code"}'
```

### Running the Application

#### Development Mode

**Option 1: Use dev script (recommended)**
```bash
# From root directory
./dev.sh

# This starts:
# - Backend: http://localhost:3000
# - Frontend: http://localhost:5173
```

**Option 2: Manual start**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

#### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Admin Panel**: http://localhost:5173/login

### Creating Your First Project

1. Log in as admin (or create the first admin via signup)
2. Navigate to dashboard
3. Click "Create Project"
4. Fill in details:
   - Code: ABC123 (6 characters)
   - Title: "Argumentative Essay"
   - Description: "Write a 150-word essay..."
   - Word Limit: 150
   - Attempt Limit: 3
   - Review Cooldown: 120 seconds
5. Click "Create"
6. Share project URL with students: `http://localhost:5173/projects/ABC123`

---

## 14. Testing Strategy

### E2E Testing

#### Setup

```bash
cd e2e
npm install playwright
```

#### Test Files

- `game-attack.spec.mjs`: Tests attack/defend mechanics
- Future: `essay-submission.spec.mjs`, `admin-workflow.spec.mjs`

#### Running Tests

```bash
# From root directory
npm run e2e:test

# Or manually
E2E_TEST=1 REVIEW_COOLDOWN_MS=10000 node e2e/game-attack.spec.mjs
```

#### Test Coverage

**Current E2E Tests:**
1. Player initialization
2. Attack token earning
3. Attack initiation
4. Defense modal appearance
5. Shield usage
6. Accept attack
7. Timeout auto-resolve
8. Token updates

**Test Utilities:**
- `POST /test/reset-tokens`: Reset player tokens for testing
- `E2E_TEST=1`: Enable mock AI responses (skip OpenAI calls)

#### Test Structure

```javascript
// e2e/game-attack.spec.mjs
import { chromium } from 'playwright';

async function runTests() {
  const browser = await chromium.launch();
  
  // Test 1: Initialize players
  const pageA = await browser.newPage();
  await pageA.goto('http://localhost:5173/projects/TEST');
  await pageA.fill('input[name="userName"]', 'Alice');
  await pageA.click('button:has-text("Continue")');
  
  // Test 2: Submit review to earn attack token
  await pageA.fill('textarea', 'Sample essay...');
  await pageA.click('[data-testid="submit-review-btn"]');
  await pageA.waitForSelector('[data-testid="attack-player-btn"]');
  
  // Test 3: Attack another player
  await pageA.click('[data-testid="attack-player-btn"]');
  await pageA.click('[data-testid="attack-btn-Bob"]');
  
  // Test 4: Defend on other page
  const pageB = await browser.newPage();
  await pageB.goto('http://localhost:5173/projects/TEST');
  await pageB.fill('input[name="userName"]', 'Bob');
  await pageB.click('button:has-text("Continue")');
  await pageB.waitForSelector('[data-testid="pending-attack-modal"]');
  await pageB.click('[data-testid="use-shield-btn"]');
  
  console.log('✅ All tests passed');
}
```

### Unit Testing

#### Backend Tests (Jest + Supertest)

**Test Suite: 20 tests passing (100%)**

**Setup:**
```bash
cd backend
npm test
```

**Test Files:**

1. **`src/routes/__tests__/game.test.ts`** (8 tests)
   - Player initialization and state persistence
   - Heartbeat mechanism for active player tracking
   - Attack/defend game mechanics with real database
   - Project enabled/disabled gating
   - Token validation and updates
   - Uses real PostgreSQL with TEST01 project code

2. **`src/routes/__tests__/public.test.ts`** (4 tests)
   - Project access validation
   - Student ID validation against roster
   - Disabled project blocking
   - Column normalization (user_name_norm, project_code)

3. **`src/db/__tests__/index.test.ts`** (10 tests)
   - normalizeProjectCode() utility function
   - normalizeUserName() utility function
   - validateStudentInRoster() database query
   - Test uses real database, no mocks

**Configuration:**
```javascript
// backend/jest.config.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  maxWorkers: 1 // Sequential execution to prevent race conditions
};
```

**Key Testing Patterns:**
- Real database integration (no mocks)
- Sequential test execution with `--runInBand`
- Supertest for HTTP assertions
- beforeAll/afterAll for database setup/cleanup
- Test database with enabled column for project gating

#### Frontend Tests (Jest + React Testing Library)

**Test Suite: 28 tests passing (100%)**

**Setup:**
```bash
cd frontend
npm test
```

**Test Files:**

1. **`src/pages/__tests__/HomePage.test.jsx`** (15 tests)
   - Project code and student ID entry
   - Input validation (required fields, format)
   - API integration with mocked fetch
   - localStorage persistence (project code, student ID)
   - Error handling for invalid inputs
   - Navigation after successful validation

2. **`src/pages/__tests__/ProjectPage.test.jsx`** (13 tests)
   - Credential loading from localStorage
   - Access control (blocks users without credentials)
   - Token display and game UI
   - Review history rendering
   - Helper function: defaultUserState() provides mock data

3. **`src/pages/admin/__tests__/AdminDashboard.test.jsx`** (10 tests)
   - Project list rendering
   - Enable/disable toggle operations
   - Optimistic UI updates
   - Error handling and rollback
   - Helper function: getStatusCheckbox() for checkbox selection

**Configuration:**
```javascript
// frontend/jest.config.cjs
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
```

**ESM Compatibility:**
- Configuration files use `.cjs` extension and `module.exports` syntax
- Required because package.json has `"type": "module"`
- Both `jest.config.cjs` and `babel.config.cjs` use CommonJS format

**Key Testing Patterns:**
- localStorage mocking with Storage.prototype spying
- API mocking with jest.fn() for fetch calls
- React Testing Library queries (getByRole, getByLabelText)
- User event simulation with fireEvent
- waitFor() for async operations
- Helper functions for reusable test data

**Component Fixes for Testing:**
- Added `import React from 'react'` to TokenDisplay.jsx and TokenIcons.jsx
- Fixed import.meta.env compatibility in AttackModal.jsx and DefenseModal.jsx
- Proper mock structures for game state and review history

**Running All Tests:**
```bash
# From root directory
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- HomePage.test.jsx

# Watch mode
npm test -- --watch
```

**Test Coverage Summary:**
- Total: 48 tests passing (20 backend + 28 frontend)
- Success Rate: 100%
- Test Suites: 6 files (3 backend + 3 frontend)
- Real database integration for backend
- Comprehensive mocking for frontend

### Manual Testing Checklist

**Essay Submission Flow:**
- [ ] Enter name and see tokens
- [ ] Write essay under word limit
- [ ] Submit for review
- [ ] See loading animation
- [ ] View feedback in all 3 tabs
- [ ] See final score
- [ ] Verify cooldown works
- [ ] Verify token deduction
- [ ] Submit final essay
- [ ] Verify cannot edit after submission

**Game Mechanics:**
- [ ] Earn attack token after review
- [ ] See active players list
- [ ] Attack shows disabled for no-token players
- [ ] Attack initiates successfully
- [ ] Defense modal appears within 1 second
- [ ] Countdown timer works (15s → 0s)
- [ ] Shield button works
- [ ] Accept button works
- [ ] Timeout auto-resolves
- [ ] Tokens update correctly

**Admin Features:**
- [ ] Login with valid credentials
- [ ] Create new project
- [ ] View submissions list
- [ ] Grade individual submission
- [ ] View AI review history
- [ ] Leaderboard updates

---

## 15. Deployment Guide

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use secure SESSION_SECRET (32+ random characters)
- [ ] Enable HTTPS for frontend
- [ ] Use wss:// for WebSocket in production
- [ ] Set restrictive CORS_ORIGIN
- [ ] Enable secure cookies (httpOnly, secure, sameSite)
- [ ] Set up database backups
- [ ] Monitor OpenAI API usage/costs
- [ ] Set up error logging (e.g., Sentry)
- [ ] Configure rate limiting

### Deployment Options

#### Option 1: Render.com (Recommended)

**Backend:**
1. Create Web Service on Render
2. Connect GitHub repo
3. Build command: `cd backend && npm install && npm run build`
4. Start command: `cd backend && npm start`
5. Add environment variables:
   - DATABASE_URL
   - OPENAI_API_KEY
   - SESSION_SECRET
   - CORS_ORIGIN
   - NODE_ENV=production

**Frontend:**
1. Create Static Site on Render
2. Build command: `cd frontend && npm install && npm run build`
3. Publish directory: `frontend/dist`
4. Add environment variable:
   - VITE_API_BASE (backend URL)

**Database:**
- Use Neon.tech or Render's PostgreSQL

#### Option 2: Vercel + Railway

**Frontend (Vercel):**
```bash
cd frontend
vercel deploy --prod
```

**Backend (Railway):**
1. Create new project on Railway
2. Add PostgreSQL database
3. Deploy from GitHub
4. Set environment variables

#### Option 3: Docker (Self-hosted)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
EXPOSE 3000
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: agentic_ai
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/agentic_ai
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      SESSION_SECRET: ${SESSION_SECRET}
      NODE_ENV: production
    depends_on:
      - db
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Post-Deployment

1. **Run migrations:**
   ```bash
   # SSH into backend server
   npm run db:migrate
   ```

2. **Create admin user:**
   ```bash
   curl -X POST https://your-api.com/api/auth/admin/signup \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"secure-password","accessCode":"your-access-code"}'
   ```

3. **Monitor logs:**
   - Check for OpenAI API errors
   - Monitor WebSocket connections
   - Watch database connection pool

4. **Set up backups:**
   - Daily database backups
   - Store submissions separately if needed

---

## 16. Troubleshooting

### Common Issues

#### 1. "No review tokens available"

**Symptoms:** Cannot submit essay for review.

**Causes:**
- Used all review tokens (default 3 per project)
- Tokens stolen via attacks

**Solutions:**
- Win attacks to regain tokens
- Admin can reset via database:
  ```sql
  UPDATE player_state 
  SET review_tokens = 3 
  WHERE project_code = 'ABC123' AND user_name_norm = 'alice';
  ```

#### 2. "Please wait X seconds before submitting"

**Symptoms:** Cooldown timer prevents review.

**Causes:**
- Review cooldown (default 120 seconds)

**Solutions:**
- Wait for cooldown
- Admin can modify project cooldown:
  ```sql
  UPDATE projects 
  SET review_cooldown_seconds = 60 
  WHERE code = 'ABC123';
  ```
- Or clear last review time:
  ```sql
  UPDATE player_state 
  SET last_review_at = NULL 
  WHERE project_code = 'ABC123' AND user_name_norm = 'alice';
  ```

#### 3. Defense modal buttons not working

**Symptoms:** Cannot click "Use Shield" or "Accept".

**Causes:**
- React closure issue (fixed in v1.0.0)
- Defending state stuck

**Solutions:**
- Refresh page
- Check browser console for errors
- Ensure latest code (useCallback + useRef fix)

#### 4. WebSocket disconnections

**Symptoms:** Not receiving attack notifications, token updates delayed.

**Causes:**
- Network issues
- Server restart
- WebSocket connection timeout

**Solutions:**
- Check network tab in DevTools
- Verify WebSocket URL (ws:// vs wss://)
- Implement reconnect logic (future enhancement)

#### 5. "Attack already resolved"

**Symptoms:** Defense response fails.

**Causes:**
- 15-second timeout expired
- Attack already defended
- Multiple defense attempts

**Solutions:**
- Refresh page to see updated state
- Check attack status in database:
  ```sql
  SELECT * FROM attacks 
  WHERE project_code = 'ABC123' 
  AND target_name_norm = 'alice'
  ORDER BY created_at DESC LIMIT 1;
  ```

#### 6. AI Review errors

**Symptoms:** "Failed to process review request"

**Causes:**
- OpenAI API key invalid/expired
- Rate limiting
- API downtime
- Content policy violation

**Solutions:**
- Check `OPENAI_API_KEY` in `.env`
- Verify API key has credits
- Check OpenAI status page
- Review essay content for violations
- Enable E2E_TEST mode to bypass OpenAI:
  ```bash
  E2E_TEST=1 npm run dev
  ```

#### 7. Database connection failures

**Symptoms:** "Failed to connect to database"

**Causes:**
- Invalid DATABASE_URL
- Network issues
- SSL certificate problems
- Connection pool exhausted

**Solutions:**
- Verify DATABASE_URL format:
  ```
  postgresql://user:password@host:5432/database?sslmode=require
  ```
- Check Neon.tech dashboard for status
- Restart backend:
  ```bash
  pkill -f tsx
  cd backend && npm run dev
  ```
- Increase pool size in `db/index.ts`:
  ```typescript
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20  // Increase from default
  });
  ```

### Debugging Tips

#### Backend Logging

Add detailed logging:

```typescript
// In routes/game.ts attack endpoint
console.log('[ATTACK] Initiated:', {
  attacker: attackerName,
  target: targetName,
  attackerTokens: attackerResult.rows[0]
});
```

#### Frontend Debugging

```javascript
// In ProjectPage.jsx
useEffect(() => {
  console.log('State updated:', {
    tokens,
    userState,
    incomingAttackId
  });
}, [tokens, userState, incomingAttackId]);
```

#### Database Queries

```sql
-- Check player state
SELECT * FROM player_state WHERE project_code = 'ABC123';

-- Check active attacks
SELECT * FROM attacks 
WHERE project_code = 'ABC123' 
AND status = 'pending';

-- Check review history
SELECT user_name, category, attempt_number, score, created_at
FROM review_attempts
WHERE project_code = 'ABC123'
ORDER BY created_at DESC;

-- Check active sessions
SELECT * FROM active_sessions 
WHERE project_code = 'ABC123'
AND last_seen > NOW() - INTERVAL '2 minutes';
```

---

## 17. Known Limitations

### Current Limitations

1. **Attack Persistence**
   - Can only attack each player once per project
   - No mechanism to reset attack history

2. **Token Economy**
   - Attack tokens capped at 1 (cannot stockpile)
   - Review tokens capped at project limit (usually 3)
   - Shield tokens cannot be earned (only initial allocation)

3. **WebSocket Reliability**
   - No automatic reconnection
   - Connection lost on page refresh
   - No offline queuing of messages

4. **Scalability**
   - In-memory WebSocket connections (not distributed)
   - Single server deployment
   - No horizontal scaling support

5. **AI Review Quality**
   - Dependent on OpenAI API availability
   - No fallback if API fails
   - Limited customization of rubric
   - No human review validation

6. **Admin Features**
   - Cannot edit existing projects (only delete/recreate)
   - No bulk operations on submissions
   - No export functionality (CSV, PDF)
   - No analytics dashboard

7. **Student Experience**
   - Cannot delete/edit review history
   - No draft saving (only localStorage)
   - Cannot view other students' essays
   - Limited feedback on why attacks fail

8. **Security**
   - No rate limiting on API endpoints
   - Session-based auth (not JWT)
   - No 2FA for admin accounts
   - User names not authenticated (anyone can impersonate)

### Edge Cases

1. **Simultaneous Attacks**
   - Two players attacking same target: Only first succeeds
   - UNIQUE constraint prevents duplicates

2. **Attack During Submission**
   - Player can lose tokens while submitting review
   - May cause review to fail with "No tokens"

3. **Offline Player Attacks**
   - Can initiate attack on offline player
   - WebSocket notification fails silently
   - Attack auto-resolves after 15s

4. **Essay Length Validation**
   - Only client-side validation
   - Backend doesn't enforce word limit
   - Possible to bypass by direct API call

---

## 18. Future Improvements

### High Priority

1. **WebSocket Improvements**
   - Implement auto-reconnection
   - Add connection status indicator
   - Queue messages during disconnection
   - Use Redis for distributed WebSocket (multi-server support)

2. **Enhanced Security**
   - Rate limiting (express-rate-limit)
   - Student authentication system
   - JWT tokens for API
   - Admin 2FA
   - Input sanitization improvements

3. **Token Economy Enhancements**
   - Allow earning shield tokens (e.g., daily login, perfect scores)
   - Implement token shop (spend attack tokens for shields)
   - Add power-ups (double damage, reflect attack, etc.)
   - Token history/transaction log

4. **Admin Features**
   - Project editing (not just create/delete)
   - Bulk operations (export all submissions as CSV)
   - Analytics dashboard (avg scores, completion rate, attack stats)
   - Custom rubrics per project
   - Scheduled project activation/closure

### Medium Priority

5. **Student Experience**
   - Draft autosave to server (not just localStorage)
   - Essay versioning (see all past revisions)
   - Peer review system (exchange feedback for tokens)
   - Achievement system (badges for milestones)
   - Student profile page

6. **AI Review Improvements**
   - Custom rubric builder
   - Comparative feedback (previous vs current essay)
   - Targeted improvement prompts based on score
   - Multi-language support
   - Plagiarism detection

7. **Game Mechanics**
   - Teams/alliances
   - Tournaments with brackets
   - Timed challenges (bonus tokens for speed)
   - Leaderboard categories (best improvement, most helpful feedback)
   - Seasonal rankings

8. **Notifications**
   - Email notifications for admin (new submissions)
   - Push notifications for attacks (if PWA)
   - Discord/Slack integration
   - SMS notifications (optional)

### Low Priority (Nice to Have)

9. **UI/UX Enhancements**
   - Dark mode
   - Mobile-responsive improvements
   - Accessibility (ARIA labels, keyboard navigation)
   - Animation polish
   - Customizable themes per project

10. **Data Export**
    - Student report cards (PDF)
    - Project summary reports
    - Analytics visualizations
    - Export review history as JSON

11. **Integration**
    - LMS integration (Canvas, Moodle)
    - Google Classroom integration
    - OAuth login (Google, Microsoft)

12. **Testing**
    - Unit tests (Jest)
    - API integration tests
    - More comprehensive E2E tests
    - Performance testing
    - Load testing

### Technical Debt

- **TypeScript Migration**: Complete conversion (some .jsx files remain)
- **Error Handling**: Standardize error responses across API
- **Code Documentation**: Add JSDoc comments
- **API Versioning**: Implement /api/v1, /api/v2 structure
- **Database Migrations**: Use proper migration tool (e.g., Knex, Prisma)
- **Logging**: Implement structured logging (Winston, Pino)
- **Monitoring**: Add APM (New Relic, Datadog)

---

## Appendix A: Database Schema Diagram

```
┌──────────────────┐
│  admin_users     │
│──────────────────│
│ id (PK)          │
│ username (UQ)    │
│ password_hash    │
│ is_super_admin   │
│ created_at       │
└──────────────────┘
         │
         │ 1:N (created_by)
         ▼
┌──────────────────────────┐
│  projects                │
│──────────────────────────│
│ code (PK)                │
│ title                    │
│ description              │
│ youtube_url              │
│ word_limit               │
│ attempt_limit_per_cat    │
│ review_cooldown_seconds  │
│ enable_feedback          │
│ created_by_admin_id (FK) │
│ created_at, updated_at   │
└──────────────────────────┘
         │
         │ 1:N
         ├──────────────────┬──────────────────┬──────────────────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  submissions    │ │ review_      │ │ player_      │ │ active_      │ │ attacks      │
│─────────────────│ │ attempts     │ │ state        │ │ sessions     │ │──────────────│
│ id (PK)         │ │──────────────│ │──────────────│ │──────────────│ │ id (PK)      │
│ project_code FK │ │ id (PK)      │ │ id (PK)      │ │ id (PK)      │ │ project_code │
│ user_name       │ │ project_code │ │ project_code │ │ project_code │ │ attacker_*   │
│ user_name_norm  │ │ user_name    │ │ user_name    │ │ user_name    │ │ target_*     │
│ essay           │ │ user_name_   │ │ user_name_   │ │ user_name_   │ │ status       │
│ submitted_at    │ │   norm       │ │   norm       │ │   norm       │ │ shield_used  │
│ admin_score     │ │ category     │ │ review_      │ │ session_id   │ │ created_at   │
│ admin_feedback  │ │ attempt_num  │ │   tokens     │ │ last_seen    │ │ responded_at │
│ updated_at      │ │ essay_       │ │ attack_      │ │ created_at   │ │ expires_at   │
└─────────────────┘ │   snapshot   │ │   tokens     │ └──────────────┘ └──────────────┘
                    │ status       │ │ shield_      │
                    │ score        │ │   tokens     │
                    │ final_score  │ │ last_review_ │
                    │ result_json  │ │   at         │
                    │ error_msg    │ │ created_at   │
                    │ created_at   │ │ updated_at   │
                    │ submission_  │ └──────────────┘
                    │   id (FK)    │
                    └──────────────┘
```

---

## Appendix B: API Endpoint Summary

### Public API (`/api/public`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/projects/:code` | No | Get project info |
| GET | `/projects/:code/user-state` | No | Get review history |
| POST | `/projects/:code/reviews` | No | Submit for AI review |
| POST | `/projects/:code/submissions/final` | No | Submit final essay |
| GET | `/projects/:code/leaderboard` | No | Top 3 scores |

### Game API (`/api/game`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/projects/:code/player/init` | No | Initialize tokens |
| POST | `/projects/:code/heartbeat` | No | Update active session |
| GET | `/projects/:code/active-players` | No | List online players |
| POST | `/projects/:code/attack` | No | Initiate attack |
| POST | `/projects/:code/defend` | No | Respond to attack |

### Admin API (`/api/admin`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/projects` | Yes | Create project |
| GET | `/projects` | Yes | List all projects |
| GET | `/projects/:code/submissions` | Yes | List submissions |
| GET | `/projects/:code/submissions/:id` | Yes | Get submission detail |
| PATCH | `/projects/:code/submissions/:id/score` | Yes | Update score |
| DELETE | `/projects/:code` | Yes | Delete project |

### Auth API (`/api/auth`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/admin/signup` | No | Admin signup (access code required) |
| POST | `/admin/login` | No | Admin login |
| POST | `/logout` | Yes | Admin logout |
| GET | `/me` | Yes | Check auth status |

### Test API (`/api/test`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/reset-tokens` | No* | Reset player tokens |
| POST | `/create-project` | No* | Create test project |
| GET | `/health` | No | Health check |

*Only available when `E2E_TEST=1`

---

## Appendix C: Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for AI reviews |
| `SESSION_SECRET` | Yes | - | Secret for session encryption |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Frontend URL for CORS |
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `E2E_TEST` | No | `0` | Enable test mode (1=on) |
| `REVIEW_COOLDOWN_MS` | No | - | Override project cooldown |

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE` | No | `/api` | Backend API base URL |
| `VITE_WS_URL` | No | `ws://localhost:3000` | WebSocket URL |

---

## Appendix D: File Size & Performance

### Typical Database Sizes

| Table | Rows (100 users) | Approx Size |
|-------|------------------|-------------|
| `projects` | 5-20 | < 1 MB |
| `submissions` | 100 | ~500 KB |
| `review_attempts` | 900 (3 per user × 3 categories) | ~5 MB |
| `player_state` | 100 | < 100 KB |
| `active_sessions` | 10-50 (concurrent) | < 50 KB |
| `attacks` | 200-500 | ~200 KB |
| `admin_users` | 1-10 | < 10 KB |

**Total:** ~7 MB for 100 active users

### API Response Times

| Endpoint | Avg Response | Notes |
|----------|--------------|-------|
| `GET /projects/:code` | 10-20ms | Cached |
| `GET /user-state` | 30-50ms | Multiple queries |
| `POST /reviews` | 3-10s | OpenAI API call |
| `POST /attack` | 20-40ms | Transaction + WS |
| `POST /defend` | 30-60ms | Transaction + broadcast |

### Frontend Bundle Sizes

- **Development**: ~2-3 MB (unminified)
- **Production**: ~200-300 KB (minified + gzipped)

---

## Conclusion

This documentation covers the complete Agentic AI Learning Platform. For questions, issues, or feature requests, please refer to the project repository or contact the development team.

**Quick Links:**
- Repository: [GitHub URL]
- Issues: [GitHub Issues URL]
- Documentation Updates: Check git history of this file

**Version History:**
- v1.0.0 (Feb 2026): Initial comprehensive documentation

---

**Document Maintainer:** Development Team  
**Last Reviewed:** February 9, 2026  
**Next Review:** As needed for major updates
