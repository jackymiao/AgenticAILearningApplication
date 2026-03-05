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

### Current Coverage ❌ NOT TRACKED

- **Missing Table**: No table currently tracks editor/text box focus events

### What's Needed

Create new table to track text box interactions:

```sql
CREATE TABLE IF NOT EXISTS editor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code CHAR(6) NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  user_name_norm TEXT NOT NULL,

  -- Session identification
  session_id TEXT NOT NULL,

  -- Event tracking
  event_type TEXT NOT NULL CHECK (event_type IN ('focus', 'blur')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional: duration if we calculate on client
  duration_ms INTEGER,

  -- Context
  essay_length INTEGER, -- word count at time of event
  current_attempt_number INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_event UNIQUE (session_id, timestamp)
);

CREATE INDEX idx_editor_sessions_lookup ON editor_sessions(project_code, user_name_norm);
CREATE INDEX idx_editor_sessions_timestamp ON editor_sessions(created_at DESC);
CREATE INDEX idx_editor_sessions_event ON editor_sessions(event_type);
```

### Frontend Integration Needed

```javascript
// In text editor component:
- Listen for onFocus event → send 'focus' event to backend
- Listen for onBlur event → send 'blur' event to backend
- Include timestamp, essay length, attempt number in each event

// Calculate total focused time:
Total = sum of (blur_timestamp - focus_timestamp) for all focus/blur pairs
```

### Status: ❌ MISSING - Needs table creation + frontend integration

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

| Data Type          | Status     | Current Table(s)                 | Key Fields                                                                | Action Required                                       |
| ------------------ | ---------- | -------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Draft Snapshot** | ✅ Ready   | `review_attempts`, `submissions` | `essay_snapshot`, `essay`, `attempt_number`, `created_at`, `submitted_at` | None                                                  |
| **Time on Task**   | ❌ Missing | None                             | N/A                                                                       | Create `editor_sessions` table + frontend integration |
| **Game Event**     | ✅ Ready   | `attacks`                        | `created_at`, `responded_at`, `shield_used`, `status`                     | None                                                  |
| **Task Event**     | ✅ Ready   | `review_attempts`, `submissions` | `created_at`, `attempt_number`, `status`, `score`, `submitted_at`         | None                                                  |

---

## Immediate Actions Required

### 1. Time on Task Tracking (Only Missing Component)

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

#### Backend: Create Route to Log Editor Events

File: `/backend/src/routes/public.ts` (add new endpoint)

```typescript
// POST /projects/:code/editor-events
// Track when student opens/closes text editor
router.post("/projects/:code/editor-events", async (req, res) => {
  const {code} = req.params;
  const {userName, eventType, duration_ms, essay_length, attempt_number} =
    req.body;

  if (!userName || !eventType) {
    return res.status(400).json({error: "userName and eventType required"});
  }

  try {
    await pool.query(
      `INSERT INTO editor_sessions 
       (project_code, user_name_norm, session_id, event_type, duration_ms, 
        essay_length, current_attempt_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        code,
        userName.toLowerCase(),
        req.sessionID,
        eventType,
        duration_ms,
        essay_length,
        attempt_number,
      ],
    );

    res.json({success: true});
  } catch (error) {
    console.error("Error logging editor event:", error);
    res.status(500).json({error: "Failed to log event"});
  }
});
```

#### Frontend: Track Text Box Focus/Blur

In your essay editor component:

```javascript
const handleEditorFocus = () => {
  sessionStorage.setItem("editorFocusTime", Date.now());
};

const handleEditorBlur = async () => {
  const focusTime = sessionStorage.getItem("editorFocusTime");
  if (!focusTime) return;

  const duration = Date.now() - parseInt(focusTime);
  const wordCount = editorText.split(/\s+/).length;

  await fetch(`/projects/${projectCode}/editor-events`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      userName,
      eventType: "blur",
      duration_ms: duration,
      essay_length: wordCount,
      attempt_number: currentAttempt,
    }),
  });
};

// In your textarea/contentEditable element:
<textarea
  onFocus={handleEditorFocus}
  onBlur={handleEditorBlur}
  // ...other props
/>;
```

---

## Data Export Queries

Once all tables are in place, use these queries for analysis:

```sql
-- Complete student activity timeline
SELECT
  'draft_snapshot' as event_type,
  ra.created_at as timestamp,
  ra.user_name_norm,
  ra.attempt_number,
  ra.category,
  LENGTH(ra.essay_snapshot) as draft_length,
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
  es.duration_ms,
  NULL
FROM editor_sessions es
WHERE es.project_code = $1

UNION ALL

SELECT
  'game_event' as event_type,
  a.created_at,
  a.attacker_name_norm as user_name_norm,
  NULL,
  CASE WHEN a.shield_used THEN 'shield' ELSE 'steal' END,
  NULL,
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
  LENGTH(s.essay),
  NULL
FROM submissions s
WHERE s.project_code = $1

ORDER BY timestamp, user_name_norm;
```

---

## Summary

✅ **3 out of 4 data types are ready** - No schema changes needed
❌ **1 data type needs implementation** - Time on Task requires new table + frontend integration

The existing schema captures draft snapshots, game events, and task events perfectly. You only need to add the `editor_sessions` table and client-side event tracking for complete time-on-task analytics.
