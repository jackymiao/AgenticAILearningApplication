# Agent Builder Integration - Preset Agent IDs Update

## Summary

Successfully refactored the project to use **preset Agent Builder SDK IDs** instead of requiring admins to manually enter agent IDs. This simplifies the admin workflow significantly.

---

## What Changed

### Backend Changes

#### 1. Created Preset Agent IDs Configuration
**File**: `backend/src/config/agentIds.ts` (NEW)

```typescript
export const PRESET_AGENT_IDS = {
  agent_a: 'asst_preset_agent_a_001',
  agent_b: {
    grammar: 'asst_preset_grammar_001',
    structure: 'asst_preset_structure_001',
    style: 'asst_preset_style_001',
    content: 'asst_preset_content_001'
  }
};
```

**🔧 To Use Your Real SDKs**: Simply replace these preset IDs with your actual Agent Builder SDK IDs.

#### 2. Simplified Database Schema
**File**: `backend/src/db/schema.sql`

**Removed columns**:
- `agent_a_id`
- `agent_b_grammar_id`
- `agent_b_structure_id`
- `agent_b_style_id`
- `agent_b_content_id`

**Kept**:
- `agent_mode` (either 'agent_a' or 'agent_b')

The system now automatically selects the correct preset agent ID based on the mode.

#### 3. Updated Project Type Definition
**File**: `backend/src/types.ts`

Removed all agent ID fields from the `Project` interface - only `agent_mode` remains.

#### 4. Updated Agent Selection Logic
**File**: `backend/src/services/agentBuilder.ts`

```typescript
export function selectAgentId(project: Project, category: ReviewCategory): string {
  if (project.agent_mode === 'agent_a') {
    return PRESET_AGENT_IDS.agent_a;
  }
  
  // Agent B mode - category-specific agents
  return PRESET_AGENT_IDS.agent_b[category];
}
```

Now uses preset IDs from config file instead of database columns.

#### 5. Simplified Admin Routes
**File**: `backend/src/routes/admin.ts`

- **POST /projects**: Removed agent ID validation and database insertion
- **PUT /projects/:code**: Removed agent ID fields from update

Admin only needs to specify `agentMode` ('agent_a' or 'agent_b').

---

### Frontend Changes

#### 1. Simplified ProjectFormData Type
**File**: `frontend/src/types.ts`

Removed all agent ID fields, kept only:
```typescript
export interface ProjectFormData {
  code?: string;
  title: string;
  description: string;
  youtubeUrl: string;
  wordLimit: number;
  attemptLimitPerCategory: number;
  agentMode: 'agent_a' | 'agent_b';  // Only this for agent configuration!
}
```

#### 2. Simplified CreateProject Form
**File**: `frontend/src/pages/admin/CreateProject.tsx`

**Removed**:
- All agent ID input fields (Agent A ID, Grammar ID, Structure ID, Style ID, Content ID)
- Conditional rendering based on agent mode

**Now shows**: Just a dropdown to select "Agent A" or "Agent B" with a note that preset SDKs will be used.

#### 3. Updated EditProject Form
**File**: `frontend/src/pages/admin/EditProject.tsx`

Similarly simplified - removed all agent ID fields.

#### 4. Enhanced ProjectPage Review Display
**File**: `frontend/src/pages/ProjectPage.tsx`

**Improvements**:
- ✅ Parses `result_json` to extract structured feedback
- ✅ Shows score prominently if available
- ✅ Better formatting for review results (white background box)
- ✅ Error messages styled distinctly with ❌ icon

```tsx
// Now extracts feedback from result_json
const result = JSON.parse(review.result_json);
const feedback = result.feedback || JSON.stringify(result, null, 2);
const score = result.score || review.score;
```

---

## How The Review System Works

### Agent A Mode
1. Admin selects "Agent A" when creating project
2. Frontend sends: `{userName, essay, category}` for review
3. Backend uses: `PRESET_AGENT_IDS.agent_a` for ALL categories
4. Same agent handles grammar, structure, style, and content

### Agent B Mode  
1. Admin selects "Agent B" when creating project
2. Frontend sends: `{userName, essay, category}` for review
3. Backend selects agent based on category:
   - `category='grammar'` → `PRESET_AGENT_IDS.agent_b.grammar`
   - `category='structure'` → `PRESET_AGENT_IDS.agent_b.structure`
   - `category='style'` → `PRESET_AGENT_IDS.agent_b.style`
   - `category='content'` → `PRESET_AGENT_IDS.agent_b.content`
4. Specialized agent for each category

### Review Flow
1. **Student writes essay** in textarea
2. **Clicks "Run Review"** on any category tab
3. **Backend**:
   - Creates new thread for this review
   - Sends essay to appropriate Agent Builder SDK
   - Stores review attempt with `essay_snapshot`
4. **Frontend displays** parsed feedback with score
5. **Student iterates** until satisfied (within attempt limits)
6. **Final submit** stores final essay in `submissions` table

---

## Migration Required

### Database Migration

Since we removed columns from the schema, existing databases need migration:

```sql
-- Run this on your existing database
ALTER TABLE projects 
  DROP COLUMN IF EXISTS agent_a_id,
  DROP COLUMN IF EXISTS agent_b_grammar_id,
  DROP COLUMN IF EXISTS agent_b_structure_id,
  DROP COLUMN IF EXISTS agent_b_style_id,
  DROP COLUMN IF EXISTS agent_b_content_id;
```

Or simply recreate the database:
```bash
cd backend
npm run migrate
```

---

## Next Steps

### 1. Replace Preset Agent IDs with Your Real SDKs

Edit `backend/src/config/agentIds.ts` and replace the placeholder IDs:

```typescript
export const PRESET_AGENT_IDS = {
  agent_a: 'asst_YOUR_ACTUAL_AGENT_A_ID',
  agent_b: {
    grammar: 'asst_YOUR_GRAMMAR_SDK_ID',
    structure: 'asst_YOUR_STRUCTURE_SDK_ID',
    style: 'asst_YOUR_STYLE_SDK_ID',
    content: 'asst_YOUR_CONTENT_SDK_ID'
  }
};
```

### 2. Test the Flow

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend  
cd frontend
npm run dev
```

**Test Steps**:
1. Create admin account
2. Create new project (select Agent A or Agent B)
3. Visit project page as student
4. Write essay and run reviews in each category tab
5. Check that reviews use correct agent IDs
6. Submit final essay

### 3. Configure Agent Builder SDKs

Make sure your Agent Builder SDKs are configured to:
- Accept essay text in messages
- Return feedback in JSON format with `feedback` and optional `score` fields
- Handle grading criteria for their respective categories

**Example expected response format**:
```json
{
  "score": 85,
  "feedback": "Your grammar is strong with proper use of tenses..."
}
```

---

## Benefits

✅ **Simpler Admin UX**: Just select Agent A or B, no manual ID entry  
✅ **Centralized Configuration**: All agent IDs in one config file  
✅ **Easy Updates**: Change agent IDs in one place  
✅ **Less Error-Prone**: No typos in agent IDs during project creation  
✅ **Better Display**: Review results now beautifully formatted with scores  

---

## TypeScript Status

✅ **Backend compilation**: Passed  
✅ **Frontend compilation**: Passed  
✅ **All routes updated**: Type-safe  
✅ **Database schema**: Simplified and migrated
