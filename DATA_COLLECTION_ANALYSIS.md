# Data Collection Analysis - Database Readiness

## 1. DRAFT SNAPSHOT

**Requirement**: Each time student hits submit to AI and final submission to system

### Current Coverage ✅ READY

- **Table**: `review_attempts`
  - `essay_snapshot` - TEXT field storing the essay text at time of attempt
  - `attempt_number` - INTEGER tracking which attempt this is (1, 2, 3...)
  - `created_at` - TIMESTAMPTZ recording exact timestamp
  - `status` - submission status (success/error)

- **Table**: `submissions`
  - `essay` - TEXT field storing final student submission
  - `submitted_at` - TIMESTAMPTZ recording final submission timestamp
  - `admin_score` - for later review

### Data Collected

```sql
-- View all draft snapshots for a student
SELECT
  attempt_number,
  essay_snapshot,
  status,
  created_at
FROM review_attempts
WHERE project_code = $1 AND user_name_norm = $2
ORDER BY created_at;

-- View final submission
SELECT essay, submitted_at FROM submissions
WHERE project_code = $1 AND user_name_norm = $2;
```

### Status: ✅ COMPLETE - No changes needed

---

## 2. TIME ON TASK

**Requirement**: Focused time when text box is toggled (open/close events)

### Current Coverage ✅ IMPLEMENTED

- **Table**: `editor_sessions`
  - `id` - UUID primary key for each event
  - `project_code` - which project this belongs to
  - `user_name_norm` - normalized student name
  - `session_id` - session identifier
  - `event_type` - 'focus' or 'blur' event
  - `timestamp` - TIMESTAMPTZ when event occurred
  - `duration_ms` - how long the session lasted (for blur events)
  - `essay_length` - word count at time of event
  - `current_attempt_number` - which attempt number
  - `created_at` - record timestamp
  - Indexes on (project_code, user_name_norm), (created_at DESC), (event_type)

### Backend Integration ✅ IMPLEMENTED

- **Endpoint**: `POST /projects/:code/editor-events`
- **Location**: `src/routes/public.ts`
- **Logs**: `[EDITOR]` prefixed console messages
- **Features**:
  - Accepts focus/blur events from frontend
  - Calculates and stores duration_ms
  - Stores word count and attempt context
  - Non-blocking, async storage

### Frontend Integration ✅ IMPLEMENTED

- **Component**: `src/pages/ProjectPage.jsx`
- **Handlers**:
  - `onFocus` - captures editor focus timestamp
  - `onBlur` - calculates duration and sends to backend
  - Tracks essay word count with each event
- **Data Sent**:
  ```json
  {
    "userName": "student_name",
    "eventType": "blur",
    "duration_ms": 45000,
    "essay_length": 250,
    "attempt_number": 1
  }
  ```

### Data Queries

```sql
-- Timeline of all editor focus/blur events for a student
SELECT
  event_type,
  timestamp,
  duration_ms,
  essay_length,
  current_attempt_number
FROM editor_sessions
WHERE project_code = $1 AND user_name_norm = $2
ORDER BY timestamp;

-- Calculate total time on task per attempt
SELECT
  current_attempt_number,
  SUM(duration_ms) as total_focus_time_ms,
  COUNT(*) as focus_sessions,
  AVG(duration_ms) as avg_session_duration_ms
FROM editor_sessions
WHERE project_code = $1 AND user_name_norm = $2 AND event_type = 'blur'
GROUP BY current_attempt_number;

-- Time on task by student (summary)
SELECT
  user_name_norm,
  COUNT(CASE WHEN event_type = 'blur' THEN 1 END) as total_focus_sessions,
  SUM(CASE WHEN event_type = 'blur' THEN duration_ms ELSE 0 END) as total_time_ms,
  ROUND(SUM(CASE WHEN event_type = 'blur' THEN duration_ms ELSE 0 END) / 1000.0 / 60, 2) as total_time_minutes
FROM editor_sessions
WHERE project_code = $1
GROUP BY user_name_norm
ORDER BY total_time_ms DESC;
```

### Migration Info

- **File**: `src/db/migrate-editor-sessions.ts`
- **Status**: ✅ Executed successfully
- **Timestamp**: March 5, 2026
- **Tables Created**: 1 (editor_sessions)
- **Indexes Created**: 3

### Status: ✅ COMPLETE - Fully implemented and deployed

---

## 3. GAME EVENT

**Requirement**: Timestamp of steal, count of steal success/fail, shield usage

### Current Coverage ✅ READY

- **Table**: `attacks`
  - `id` - UUID for unique attack
  - `attacker_name_norm` - who initiated the attack
  - `target_name_norm` - who was targeted
  - `created_at` - TIMESTAMPTZ of steal attempt
  - `responded_at` - TIMESTAMPTZ of defense/shield response (if any)
  - `status` - ('pending', 'defended', 'succeeded', 'expired') tracks outcome
  - `shield_used` - BOOLEAN flag if shield was deployed
  - `expires_at` - when steal window closes

### Data Collected

```sql
-- Count successful steals per player
SELECT
  attacker_name_norm,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as steal_success_count,
  COUNT(CASE WHEN status = 'defended' THEN 1 END) as steal_fail_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as steal_pending_count
FROM attacks
WHERE project_code = $1 AND created_at >= $2
GROUP BY attacker_name_norm;

-- Shield usage timeline
SELECT
  target_name_norm,
  responded_at,
  COUNT(*) as shields_used
FROM attacks
WHERE project_code = $1 AND shield_used = TRUE
GROUP BY target_name_norm, responded_at
ORDER BY responded_at;

-- Steal timeline (with success/fail)
SELECT
  created_at,
  attacker_name_norm,
  target_name_norm,
  status,
  shield_used,
  responded_at
FROM attacks
WHERE project_code = $1
ORDER BY created_at;
```

### Status: ✅ COMPLETE - No changes needed

---

## 4. TASK EVENT

**Requirement**: Timestamp of AI passes, final submission

### Current Coverage ✅ MOSTLY READY

- **Table**: `review_attempts`
  - Records each AI pass attempt
  - `created_at` - TIMESTAMPTZ of when AI was submitted
  - `attempt_number` - which attempt (1, 2, 3)
  - `category` - which category graded ('content', 'structure', 'mechanics')
  - `status` - result of AI grading ('success', 'error')
  - `score` - NUMERIC score returned

- **Table**: `submissions`
  - `submitted_at` - TIMESTAMPTZ of final submission to system
  - Links students to their final essay

### Data Collected

```sql
-- Timeline of all AI passes for a student
SELECT
  attempt_number,
  category,
  status,
  score,
  created_at
FROM review_attempts
WHERE project_code = $1 AND user_name_norm = $2
ORDER BY created_at;

-- Final submission timestamp
SELECT
  submitted_at,
  admin_score
FROM submissions
WHERE project_code = $1 AND user_name_norm = $2;

-- Join for complete task event timeline
SELECT
  COALESCE(ra.created_at, s.submitted_at) as event_time,
  CASE
    WHEN ra.id IS NOT NULL THEN 'ai_pass'
    WHEN s.id IS NOT NULL THEN 'final_submission'
  END as event_type,
  ra.attempt_number,
  ra.category,
  ra.status,
  ra.score
FROM review_attempts ra
FULL OUTER JOIN submissions s
  ON ra.project_code = s.project_code
  AND ra.user_name_norm = s.user_name_norm
WHERE ra.project_code = $1 AND ra.user_name_norm = $2
ORDER BY event_time;
```

### Status: ✅ COMPLETE - No changes needed

---

## Summary Table

| Data Type          | Status      | Current Table(s)                 | Key Fields                                                                         | Action Required |
| ------------------ | ----------- | -------------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| **Draft Snapshot** | ✅ Complete | `review_attempts`, `submissions` | `essay_snapshot`, `essay`, `attempt_number`, `created_at`, `submitted_at`          | None            |
| **Time on Task**   | ✅ Complete | `editor_sessions`                | `event_type`, `duration_ms`, `essay_length`, `current_attempt_number`, `timestamp` | None            |
| **Game Event**     | ✅ Complete | `attacks`                        | `created_at`, `responded_at`, `shield_used`, `status`                              | None            |
| **Task Event**     | ✅ Complete | `review_attempts`, `submissions` | `created_at`, `attempt_number`, `status`, `score`, `submitted_at`                  | None            |

---

## Implementation Summary

✅ **ALL DATA COLLECTION REQUIREMENTS COMPLETED**

All four data types are now fully tracked and queryable:

1. **Draft Snapshot** - Essays captured at each AI submission attempt
2. **Time on Task** - Focus/blur events tracked with duration calculations
3. **Game Event** - Steal attempts, shield usage, and outcomes timestamped
4. **Task Event** - AI passes and final submission timestamps recorded

### Database Tables

- `review_attempts` - Draft snapshots + task events
- `editor_sessions` - Time on task data (NEW - March 5, 2026)
- `attacks` - Game events
- `submissions` - Final submissions + task events

### Backend Endpoints

- `POST /projects/:code/reviews` - Submit essay reviews (captures draft snapshots & game events)
- `POST /projects/:code/editor-events` - Log editor focus/blur events (NEW - March 5, 2026)
- `POST /projects/:code/steals` - Submit steal attempts (captures game events)
- `POST /projects/:code/shields` - Use shields (captures game events)

### Frontend Components

- `ProjectPage.jsx` - Captures all events and sends to backend

---

## Immediate Actions Completed

### ✅ Time on Task Tracking (COMPLETED March 5, 2026)

#### Backend: Create Migration File

File: `/backend/src/db/migrate-editor-sessions.ts`

```typescript
import {pool} from "./index.js";

async function migrate() {
  try {
    console.log("Creating editor_sessions table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS editor_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
        user_name_norm TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('focus', 'blur')),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        duration_ms INTEGER,
        essay_length INTEGER,
        current_attempt_number INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_event UNIQUE (session_id, timestamp)
      );
      
      CREATE INDEX IF NOT EXISTS idx_editor_sessions_lookup 
      ON editor_sessions(project_code, user_name_norm);
      
      CREATE INDEX IF NOT EXISTS idx_editor_sessions_timestamp 
      ON editor_sessions(created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_editor_sessions_event 
      ON editor_sessions(event_type);
    `);

    console.log("✅ editor_sessions table created");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
```

#### Implementation Files (Completed)

**Database**:

- ✅ Created: `backend/src/db/migrate-editor-sessions.ts`
- ✅ Executed: March 5, 2026
- ✅ Table: `editor_sessions` created with 3 indexes

**Backend**:

- ✅ Updated: `backend/src/routes/public.ts`
- ✅ Endpoint: `POST /projects/:code/editor-events`
- ✅ Logging: `[EDITOR]` prefixed console output

**Frontend**:

- ✅ Updated: `frontend/src/pages/ProjectPage.jsx`
- ✅ Import: Added `useRef` from React
- ✅ Handlers: `handleEditorFocus()` and `handleEditorBlur()`
- ✅ Events: Attached to textarea element

---

## Data Export Queries

Use these queries for analysis:

```sql
-- Total time on task per student (in minutes)
SELECT
  user_name_norm,
  ROUND(SUM(CASE WHEN event_type = 'blur' THEN duration_ms ELSE 0 END) / 1000.0 / 60, 2) as total_time_minutes,
  COUNT(CASE WHEN event_type = 'blur' THEN 1 END) as focus_sessions
FROM editor_sessions
WHERE project_code = $1
GROUP BY user_name_norm
ORDER BY total_time_minutes DESC;

-- Time on task by attempt
SELECT
  user_name_norm,
  current_attempt_number,
  ROUND(SUM(CASE WHEN event_type = 'blur' THEN duration_ms ELSE 0 END) / 1000.0 / 60, 2) as time_minutes,
  MAX(essay_length) as final_essay_length
FROM editor_sessions
WHERE project_code = $1 AND event_type = 'blur'
GROUP BY user_name_norm, current_attempt_number
ORDER BY user_name_norm, current_attempt_number;

-- Complete student activity timeline (all data types)
SELECT
  'draft_snapshot' as event_type,
  ra.created_at as timestamp,
  ra.user_name_norm,
  ra.attempt_number,
  ra.category,
  LENGTH(ra.essay_snapshot) as data_size,
  ra.status
FROM review_attempts ra
WHERE ra.project_code = $1

UNION ALL

SELECT
  'editor_session' as event_type,
  es.created_at,
  es.user_name_norm,
  es.current_attempt_number,
  es.event_type as category,
  es.duration_ms as data_size,
  NULL as status
FROM editor_sessions es
WHERE es.project_code = $1

UNION ALL

SELECT
  'game_event' as event_type,
  a.created_at,
  a.attacker_name_norm as user_name_norm,
  NULL,
  CASE WHEN a.shield_used THEN 'shield' ELSE 'steal' END,
  1,
  a.status
FROM attacks a
WHERE a.project_code = $1

UNION ALL

SELECT
  'final_submission' as event_type,
  s.submitted_at,
  s.user_name_norm,
  NULL,
  'submission',
  LENGTH(s.essay) as data_size,
  NULL
FROM submissions s
WHERE s.project_code = $1

ORDER BY timestamp, user_name_norm;
```

---

## Summary

✅ **ALL 4 DATA COLLECTION TYPES FULLY IMPLEMENTED AND DEPLOYED**

- **Draft Snapshot**: ✅ Complete - Essays captured at each attempt
- **Time on Task**: ✅ Complete - Focus/blur times tracked with durations
- **Game Event**: ✅ Complete - Steal/shield events timestamped
- **Task Event**: ✅ Complete - AI passes and submissions recorded

**Commit**: `3055851` - "feat: Add time-on-task tracking with editor session analytics"
**Deployed**: March 5, 2026
**Status**: Production Ready ✅

```

The existing schema captures draft snapshots, game events, and task events perfectly. You only need to add the `editor_sessions` table and client-side event tracking for complete time-on-task analytics.
```
