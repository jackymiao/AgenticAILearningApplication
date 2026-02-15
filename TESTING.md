# Student Roster & ID System - Test Suite Documentation

This document provides comprehensive documentation for all unit tests covering the student roster and ID validation system.

## Overview

The test suite covers:
- **Backend**: API endpoints, database utilities, and project access control
- **Frontend**: UI components for student validation, project access, and admin controls

## Test Framework

- **Backend**: Jest + Supertest + TypeScript
- **Frontend**: Jest + React Testing Library + jsdom
- **Database**: Mocked (not using real Postgres)

## Running Tests

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

---

## Backend Tests

### 1. Database Utilities (`backend/src/db/__tests__/index.test.ts`)

Tests for data normalization functions used throughout the system.

#### `normalizeStudentId()`
- ✅ Removes all whitespace from student IDs
- ✅ Converts to uppercase
- ✅ Handles empty strings
- ✅ Handles tabs and newlines

**Example:**
```typescript
normalizeStudentId('jd 1234') // => 'JD1234'
normalizeStudentId('  ab  12  34  ') // => 'AB1234'
```

#### `normalizeUserName()`
- ✅ Trims and converts to lowercase
- ✅ Preserves internal spaces
- ✅ Handles empty strings

**Example:**
```typescript
normalizeUserName('John Doe') // => 'john doe'
normalizeUserName('  Jane Smith  ') // => 'jane smith'
```

#### `normalizeProjectCode()`
- ✅ Trims and converts to uppercase
- ✅ Handles mixed case
- ✅ Handles empty strings

**Example:**
```typescript
normalizeProjectCode('abc123') // => 'ABC123'
normalizeProjectCode('  test99  ') // => 'TEST99'
```

---

### 2. Admin Routes (`backend/src/routes/__tests__/admin.test.ts`)

Tests for admin-only endpoints managing projects and student rosters.

#### `GET /admin/projects`
- ✅ Returns projects for regular admin (filtered by creator)
- ✅ Returns all projects for super admin
- ✅ Handles database errors

#### `PATCH /admin/projects/:code/status`
- ✅ Enables a project
- ✅ Disables a project
- ✅ Handles string boolean values (`'true'`, `'false'`)
- ✅ Returns 404 if project not found
- ✅ Normalizes project code to uppercase

**Example Request:**
```bash
PATCH /admin/projects/test01/status
Body: { "enabled": true }
```

#### `GET /admin/projects/:code/students`
- ✅ Returns student roster for a project
- ✅ Returns empty array if no students
- ✅ Handles database errors

#### `POST /admin/projects/:code/students/import`
- ✅ Rejects missing file
- ✅ Rejects invalid file extensions (only .csv, .xlsx, .xls allowed)
- ✅ Parses CSV and generates student IDs
- ✅ Validates CSV header must be "name"
- ✅ Handles empty CSV files
- ✅ Generates unique student IDs for duplicate names
- ✅ Rolls back transaction on database error
- ✅ Replaces existing student roster (DELETE then INSERT)

**Student ID Generation:**
- Format: 2 initials + 4 random digits (e.g., `JD1234`)
- Ensures uniqueness within the roster
- Example: "John Doe" → `JD1234`, "Jane Smith" → `JS5678`

**Example CSV:**
```csv
name
John Doe
Jane Smith
Bob Johnson
```

**Example Response:**
```json
{
  "count": 3,
  "students": [
    { "student_name": "John Doe", "student_id": "JD1234" },
    { "student_name": "Jane Smith", "student_id": "JS5678" },
    { "student_name": "Bob Johnson", "student_id": "BJ9012" }
  ]
}
```

---

### 3. Public Routes (`backend/src/routes/__tests__/public.test.ts`)

Tests for publicly accessible endpoints with project enabled checks.

#### `GET /public/projects/:code`
- ✅ Returns project details when enabled
- ✅ Returns 403 when project is disabled
- ✅ Returns 404 when project not found
- ✅ Normalizes project code to uppercase
- ✅ Handles database errors

#### `POST /public/projects/:code/validate-student`
- ✅ Validates valid student ID
- ✅ Rejects when project is disabled
- ✅ Returns 404 for invalid student ID
- ✅ Requires `studentId` field
- ✅ Normalizes student ID (removes spaces, uppercase)
- ✅ Handles student IDs with various whitespace
- ✅ Handles database errors during validation

**Example Request:**
```bash
POST /public/projects/test01/validate-student
Body: { "studentId": "jd 1234" }
```

**Example Response:**
```json
{
  "studentName": "John Doe",
  "studentId": "JD1234"
}
```

#### `GET /public/projects/:code/user-state`
- ✅ Returns user state when project is enabled
- ✅ Blocks access when project is disabled

---

### 4. Game Routes (`backend/src/routes/__tests__/game.test.ts`)

Tests for game system endpoints - all protected by project enabled checks.

#### `POST /game/projects/:code/player/init`
- ✅ Initializes player when project is enabled
- ✅ Blocks player init when project is disabled
- ✅ Returns 404 when project not found
- ✅ Requires `userName` field
- ✅ Calculates cooldown remaining correctly
- ✅ Normalizes userName to lowercase

**Example Response:**
```json
{
  "reviewTokens": 3,
  "attackTokens": 0,
  "shieldTokens": 0,
  "cooldownRemaining": 0
}
```

#### Other Game Endpoints
All endpoints check if project is enabled:
- ✅ `POST /game/projects/:code/heartbeat`
- ✅ `GET /game/projects/:code/active-players`
- ✅ `POST /game/projects/:code/attack`
- ✅ `POST /game/projects/:code/defend`

**Behavior:**
- Returns 403 with message `"This project is currently disabled"` when project is disabled
- Proceeds with business logic when project is enabled

---

## Frontend Tests

### 1. HomePage (`frontend/src/pages/__tests__/HomePage.test.jsx`)

Tests for the entry page where students enter project code and student ID.

#### Project Code Validation
- ✅ Renders project code and student ID inputs
- ✅ Enforces 6-character limit on project code input
- ✅ Converts project code to uppercase as user types
- ✅ Shows error for non-alphanumeric project code
- ✅ Shows error for project code shorter than 6 characters
- ✅ Trims whitespace from project code

**Validation Rules:**
- Must be exactly 6 characters
- Only alphanumeric (letters and numbers)
- Automatically converted to uppercase
- Leading/trailing spaces are trimmed

#### Student ID Validation
- ✅ Converts student ID to uppercase as user types
- ✅ Shows error for empty student ID
- ✅ Calls `validateStudent` API with correct parameters
- ✅ Stores student credentials in localStorage on success
- ✅ Navigates to project page on successful validation
- ✅ Displays error message on failed validation
- ✅ Shows loading state during validation
- ✅ Handles API errors gracefully

**Example Flow:**
1. User enters `"test01"` → Displayed as `"TEST01"`
2. User enters `"jd1234"` → Displayed as `"JD1234"`
3. Submit → API call: `validateStudent("TEST01", "JD1234")`
4. Success → Store in localStorage → Navigate to `/projects/TEST01`

#### Form Submission
- ✅ Prevents form submission when fields are empty
- ✅ Clears previous errors on new submission

#### Input Formatting
- ✅ Uses uppercase text transform for project code
- ✅ Uses uppercase text transform for student ID
- ✅ Center-aligns project code input

---

### 2. ProjectPage (`frontend/src/pages/__tests__/ProjectPage.test.jsx`)

Tests for the main project page showing student info and essay interface.

#### Student Credentials Loading
- ✅ Loads student name and ID from localStorage
- ✅ Displays student information card when loaded
- ✅ Does not auto-submit if student credentials are missing
- ✅ Clears credentials from localStorage on validation error

**LocalStorage Keys:**
- `project_{CODE}_studentName`
- `project_{CODE}_studentId`
- `project_{CODE}_essay`

#### Student ID Display
- ✅ Displays student ID in uppercase format
- ✅ Shows student name and ID together

**Display Format:**
```
Student: John Doe
ID: JD1234
```

#### Project Access Control
- ✅ Blocks access when project is disabled
- ✅ Shows error when project not found

**Error Messages:**
- `"This project is currently disabled"`
- `"Project not found"`

#### Essay Storage
- ✅ Loads saved essay from localStorage
- ✅ Auto-saves essay to localStorage as user types

#### Token Display
- ✅ Displays review tokens from game initialization
- ✅ Initializes tokens based on project attempt limit

#### Cooldown Display
- ✅ Shows cooldown when remaining time exists
- ✅ Does not show cooldown when remaining time is 0

---

### 3. AdminDashboard (`frontend/src/pages/admin/__tests__/AdminDashboard.test.jsx`)

Tests for the admin dashboard showing project list with enable/disable controls.

#### Project List Display
- ✅ Loads and displays projects on mount
- ✅ Shows loading state while fetching projects
- ✅ Displays error message on fetch failure
- ✅ Shows empty state when no projects exist

#### Project Enable/Disable Toggle
- ✅ Displays enabled checkbox checked for enabled projects
- ✅ Displays enabled checkbox unchecked for disabled projects
- ✅ Toggles project status when checkbox is clicked
- ✅ Enables a disabled project when toggled
- ✅ Updates UI optimistically after toggle
- ✅ Displays error when toggle fails
- ✅ Disables toggle button while request is pending

**Toggle Flow:**
1. Admin clicks checkbox
2. UI updates immediately (optimistic)
3. API call: `updateProjectStatus(code, newStatus)`
4. On success: Keep UI as is
5. On error: Show error message, revert UI

#### Multiple Project Toggle
- ✅ Handles toggling multiple projects independently

#### Create Project Button
- ✅ Displays create project button
- ✅ Links to create project page (`/admin/projects/new`)

#### Project Selection
- ✅ Shows select all checkbox
- ✅ Can select multiple projects for batch operations

---

## Test Coverage Summary

### Backend Coverage
- **Database Utilities**: 100% coverage (normalization functions)
- **Admin Routes**: 
  - Project status toggle (enable/disable)
  - Student roster import (CSV/XLSX parsing)
  - Student ID generation
  - Access control (admin-only)
- **Public Routes**:
  - Student ID validation
  - Project enabled gating
  - Code/ID normalization
- **Game Routes**:
  - Project enabled checks on all endpoints
  - Player initialization with token setup

### Frontend Coverage
- **HomePage**:
  - Project code validation (6-char alphanumeric)
  - Student ID validation
  - Input formatting (uppercase, centered)
  - API integration
  - Error handling
  - LocalStorage management
- **ProjectPage**:
  - Student credential loading
  - Access control (disabled projects)
  - Student info display
  - Essay auto-save
  - Token/cooldown display
- **AdminDashboard**:
  - Project list management
  - Enable/disable toggle UI
  - Optimistic updates
  - Error handling

---

## Key Features Tested

### 1. Student ID Generation
- **Format**: 2 initials + 4 random digits (e.g., `JD1234`)
- **Uniqueness**: Guaranteed within each project roster
- **Examples**:
  - "John Doe" → `JD1234`
  - "Jane Smith" → `JS5678`
  - "Bob Johnson" → `BJ9012`

### 2. Student ID Validation
- **Normalization**: Removes spaces, converts to uppercase
- **Lookup**: Checks against `project_students` table
- **Response**: Returns student name if found, 404 if not

### 3. Project Code Validation
- **Format**: Exactly 6 alphanumeric characters
- **Normalization**: Uppercase, trimmed
- **Display**: Always shown in uppercase in UI

### 4. Project Enable/Disable Gating
- **Admin Control**: Toggle via dashboard checkbox
- **Access Control**: All public/game endpoints check `enabled` status
- **Error Response**: 403 with message when disabled

### 5. Roster Import (CSV/XLSX)
- **Header Validation**: Must have single "name" column
- **ID Generation**: Auto-generates unique IDs for all students
- **Replace Mode**: Deletes existing roster before inserting new one
- **Transaction Safety**: Rolls back on errors

### 6. Admin Toggle UI
- **Optimistic Update**: UI updates immediately on click
- **Error Handling**: Shows error, keeps state on failure
- **Loading State**: Disables checkbox during API call

---

## Running Specific Test Files

### Backend
```bash
# Run specific test file
npm test -- db/__tests__/index.test.ts
npm test -- routes/__tests__/admin.test.ts
npm test -- routes/__tests__/public.test.ts
npm test -- routes/__tests__/game.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Student ID"
```

### Frontend
```bash
# Run specific test file
npm test -- pages/__tests__/HomePage.test.jsx
npm test -- pages/__tests__/ProjectPage.test.jsx
npm test -- pages/admin/__tests__/AdminDashboard.test.jsx

# Run tests matching pattern
npm test -- --testNamePattern="validation"
```

---

## Mock Strategy

### Backend
- **Database Pool**: All `pool.query()` calls are mocked
- **Database Client**: Transaction support (BEGIN/COMMIT/ROLLBACK)
- **Auth Middleware**: Mocked to allow test requests
- **File Uploads**: Mocked using Supertest's `.attach()` method

### Frontend
- **API Calls**: All API functions mocked with `jest.fn()`
- **Router**: `useNavigate` and `useParams` mocked
- **LocalStorage**: Fully mocked with `jest.fn()` implementations
- **WebSocket**: Custom hook mocked to avoid connection

---

## Error Scenarios Tested

### Backend
- ❌ Missing required fields
- ❌ Invalid file types
- ❌ Malformed CSV headers
- ❌ Empty roster files
- ❌ Database connection errors
- ❌ Project not found
- ❌ Project disabled
- ❌ Student ID not found
- ❌ Transaction rollback scenarios

### Frontend
- ❌ Invalid project code format
- ❌ Empty student ID
- ❌ API validation failure
- ❌ Network errors
- ❌ Missing credentials in localStorage
- ❌ Disabled project access
- ❌ Toggle operation failures

---

## Next Steps

To extend the test suite:

1. **Add E2E Tests**: Use Playwright/Cypress for full user flows
2. **Add Integration Tests**: Test with real Postgres test database
3. **Add Performance Tests**: Test roster import with large files (1000+ students)
4. **Add Security Tests**: Test SQL injection, XSS, CSRF protection
5. **Add Accessibility Tests**: Use jest-axe for a11y compliance

---

## Troubleshooting

### Backend Tests Failing
- Check that `NODE_OPTIONS=--experimental-vm-modules` is set
- Ensure all mocks are cleared in `beforeEach()`
- Verify TypeScript compilation with `npm run build`

### Frontend Tests Failing
- Check that `@testing-library/jest-dom` is imported in `setupTests.js`
- Ensure Babel presets are configured correctly
- Verify React components are wrapped in `<BrowserRouter>`

### Common Issues
- **"Cannot find module"**: Check import paths and file extensions
- **"Module parse failed"**: Check Babel/TypeScript config
- **"Timeout"**: Increase Jest timeout or check for unresolved promises
- **"localStorage is not defined"**: Ensure mock is set up in `setupTests.js`

---

## Contact

For questions or issues with the test suite, please contact the development team.
