# Feedback Submission Debugging Guide

## ✅ What's Been Added

### Backend Tests (11 tests)

- ✓ Valid feedback insertion & DB verification
- ✓ Duplicate submission prevention
- ✓ Missing ratings validation
- ✓ Invalid rating values (not 1-5)
- ✓ Comment word count limit (200 words)
- ✓ Submission without comment
- ✓ Feedback disabled check
- ✓ Non-existent project check
- ✓ Check endpoint for submission status

### Frontend Tests (12 tests)

- ✓ Validation (missing ratings, word count, display)
- ✓ Successful submission (with/without comment)
- ✓ Skip functionality
- ✓ Server errors (400, 403, 409, 500)
- ✓ Network errors
- ✓ UI state (loading, disabled buttons)

### Debug Logging

Added detailed console logs in backend feedback route:

- Request received with project code & user
- Validation steps
- Database checks (project exists, feedback enabled, duplicates)
- Database insertion
- Success/error states

## 🔍 How to Debug on Render

### Step 1: Check Render Backend Logs

1. Go to your Render dashboard
2. Select your backend service
3. Click "Logs" tab
4. Filter for `[FEEDBACK]`

When a student submits feedback, you should see:

```
[FEEDBACK] Submission attempt for project TEST40, user: John Doe
[FEEDBACK] Checking for duplicate submission (hash: 48426002...)
[FEEDBACK] Inserting feedback into database...
[FEEDBACK] ✅ Success! Feedback ID: <uuid>
```

### Step 2: Check Browser Console

Have the student:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Submit feedback
4. Look for `[FeedbackModal]` logs:

```
[FeedbackModal] Submitting to: <URL>
[FeedbackModal] Response status: 201
[FeedbackModal] Feedback submitted successfully
```

### Step 3: Check Network Tab

1. Open DevTools → Network tab
2. Submit feedback
3. Find the request to `/api/public/<CODE>/feedback/submit`
4. Check:
   - **Request URL**: Should point to your backend (not localhost)
   - **Status Code**: Should be 201
   - **Response**: Should have `success: true`

## 🐛 Common Issues & Solutions

### Issue 1: Request Goes to Wrong URL

**Symptom**: Network tab shows request to `http://localhost:3000` or relative `/api`

**Cause**: Frontend not using `VITE_API_BASE` environment variable

**Solution**:

1. Verify Render Static Site build command includes:
   ```
   VITE_API_BASE=https://your-backend.onrender.com/api npm install && npm run build
   ```
2. Trigger manual redeploy with "Clear build cache & deploy"

### Issue 2: CORS Error

**Symptom**: Browser console shows CORS error, Network tab shows request canceled

**Cause**: Backend `FRONTEND_URL` doesn't match actual frontend URL

**Solution**:

1. Go to backend service → Environment
2. Verify `FRONTEND_URL` matches your frontend URL exactly
3. Save and redeploy

### Issue 3: 404 Not Found

**Symptom**: Request returns 404, backend logs show `[FEEDBACK] Project <CODE> not found`

**Cause**: Project doesn't exist or wrong code

**Solution**:

1. Verify project code is correct
2. Check admin dashboard to confirm project exists
3. Ensure project is not deleted

### Issue 4: 403 Forbidden

**Symptom**: Request returns 403, backend logs show `Feedback not enabled for project`

**Cause**: `enable_feedback` is `false` for this project

**Solution**:

1. Go to admin dashboard
2. Edit project settings
3. Enable "Collect Feedback" checkbox
4. Save

### Issue 5: 409 Conflict (Duplicate)

**Symptom**: Request returns 409, backend logs show `Duplicate submission detected`

**Cause**: User already submitted feedback for this project

**Expected Behavior**: This is correct! Each user can only submit once per project.

### Issue 6: No Backend Logs at All

**Symptom**: No `[FEEDBACK]` logs appear when submitting

**Possible Causes**:

1. **Request not reaching backend**: Check Network tab URL
2. **Wrong backend service**: Frontend pointing to old/different backend
3. **Route not registered**: Backend routes not properly configured

**Solution**:

1. Check frontend is using correct `VITE_API_BASE`
2. Verify backend service URL
3. Check backend logs for any startup errors
4. Test backend health: `GET /api/health`

### Issue 7: Database Table Missing

**Symptom**: Backend error logs show table `project_feedback` doesn't exist

**Cause**: Database migration not run on Render

**Solution**:

1. Go to backend service → Shell tab
2. Run: `npm run db:migrate`
3. Should see migration success messages
4. Verify table exists:
   ```sql
   SELECT * FROM project_feedback LIMIT 1;
   ```

## 📊 Quick Diagnostic Checklist

Run through these checks:

- [ ] Backend deployed and running (health check returns 200)
- [ ] Database migration completed (`project_feedback` table exists)
- [ ] Project has `enable_feedback = true` in database
- [ ] Frontend build command includes `VITE_API_BASE=<backend-url>/api`
- [ ] Frontend deployed after latest changes
- [ ] Backend `FRONTEND_URL` matches frontend URL
- [ ] Browser console shows correct submission URL (points to backend)
- [ ] Backend logs show `[FEEDBACK]` messages when submitting
- [ ] User hasn't already submitted (check for 409 error)

## 🧪 Test Locally First

Before debugging on Render, verify it works locally:

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Create a test project with `enable_feedback = true`
4. Submit feedback through UI
5. Check console logs on both sides
6. Verify entry in database:
   ```sql
   SELECT * FROM project_feedback ORDER BY submitted_at DESC LIMIT 5;
   ```

If it works locally but not on Render, the issue is deployment-related (usually CORS or env vars).

## 📝 Collect This Info for Support

If still stuck, gather:

1. **Backend logs** (full output from Render Logs tab)
2. **Browser console** screenshot (showing [FeedbackModal] logs)
3. **Network request** details (URL, status, response body)
4. **Project code** being tested
5. **Database query result**:
   ```sql
   SELECT code, enable_feedback FROM projects WHERE code = '<YOUR_CODE>';
   SELECT COUNT(*) FROM project_feedback WHERE project_code = '<YOUR_CODE>';
   ```

This helps pinpoint exactly where the flow breaks.
