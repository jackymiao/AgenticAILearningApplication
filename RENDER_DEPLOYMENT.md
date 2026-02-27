# Render Deployment Checklist

## 🎯 Pre-Deployment

- [ ] OpenAI API key ready
- [ ] Agent Builder agents created and tested
- [ ] GitHub repository created and code pushed
- [ ] Render account created

## 📦 Backend Deployment

### 1. Create PostgreSQL Database

**Option A: Using Neon (Recommended)**

- [ ] Go to [Neon Console](https://console.neon.tech/)
- [ ] Create new project: `essay-grading-db`
- [ ] Select region closest to your Render service
- [ ] Copy the connection string (starts with `postgresql://`)
- [ ] Make sure to use the **pooled connection string** for better performance

**Option B: Using Render PostgreSQL**

- [ ] In Render dashboard, click "New +" → "PostgreSQL"
- [ ] Name: `essay-grading-db`
- [ ] Region: Choose closest to your users
- [ ] Plan: Free (or paid for production)
- [ ] Click "Create Database"
- [ ] **Copy the Internal Database URL** (starts with `postgresql://`)

### 2. Create Backend Web Service

- [ ] Click "New +" → "Web Service"
- [ ] Connect to your GitHub repository
- [ ] Configure:
  - **Name**: `essay-grading-backend`
  - **Region**: Same as database
  - **Branch**: `main`
  - **Root Directory**: `backend`
  - **Runtime**: `Node`
  - **Build Command**: `npm install --include=dev && npm run build`
  - **Start Command**: `npm start`
  - **Plan**: Free (or paid)

### 3. Set Backend Environment Variables

Click "Environment" tab and add:

- [ ] `DATABASE_URL` = (Internal Database URL from step 1)
- [ ] `SESSION_SECRET` = (Generate random string, e.g., use `openssl rand -base64 32`)
- [ ] `ADMIN_SIGNUP_CODE` = (Your secure access code for regular admin registration)
- [ ] `SUPER_ADMIN_CODE` = (Your super secure access code for super admin - sees all projects)
- [ ] `OPENAI_API_KEY` = (Your OpenAI API key)
- [ ] `NODE_ENV` = `production`
- [ ] `FRONTEND_URL` = (Will add after frontend deployment)
- [ ] `PORT` = `3000` (optional, Render sets this automatically)

### 4. Initial Backend Deployment

- [ ] Click "Create Web Service"
- [ ] Wait for deployment to complete
- [ ] **Copy the backend URL** (e.g., `https://essay-grading-backend.onrender.com`)

### 5. Run Database Migration

**Important: You must run the migration to create required tables!**

Option A - Using Render Shell (Preferred):

- [ ] Go to backend service → "Shell" tab
- [ ] Run: `npm install tsx` (if not already installed)
- [ ] Run: `npm run db:migrate`
- [ ] Should see: "✅ Database migrations completed successfully"

Option B - Using One-Off Job:

- [ ] In service settings, create manual job
- [ ] Command: `npm run db:migrate`
- [ ] Run job

**Note for Neon users**: Neon automatically handles connection pooling. The session table will be auto-created on first use if the migration was successful.

### 6. Verify Backend

- [ ] Visit `https://your-backend-url.onrender.com/api/health`
- [ ] Should see: `{"status":"ok","timestamp":"..."}`

## 🎨 Frontend Deployment

### 1. Create Static Site

- [ ] Click "New +" → "Static Site"
- [ ] Connect to same GitHub repository
- [ ] Configure:
  - **Name**: `essay-grading-frontend`
  - **Region**: Same as backend
  - **Branch**: `main`
  - **Root Directory**: `frontend`
  - **Build Command**: `VITE_API_BASE=https://your-backend-url.onrender.com/api npm install && npm run build`
    - **IMPORTANT**: Replace `your-backend-url` with your actual backend URL from step 4
    - Example: `VITE_API_BASE=https://essay-grading-backend-abc123.onrender.com/api npm install && npm run build`
  - **Publish Directory**: `dist`

### 2. Configure SPA Routing (No Environment Variables Needed)

**Note:** For Render Static Sites, environment variables must be set in the build command (see above), not in the Environment tab. The Environment tab doesn't work for static sites during builds.

Since Render doesn't have a Redirects/Rewrites UI for static sites, create a `_redirects` file:

- [ ] In your local `frontend/public/` directory, create a file named `_redirects`
- [ ] Add this single line to the file:
  ```
  /*    /index.html   200
  ```
- [ ] Commit and push to GitHub:
  ```bash
  git add frontend/public/_redirects
  git commit -m "Add _redirects for SPA routing"
  git push
  ```

This tells Render to serve `index.html` for all routes, allowing React Router to handle client-side navigation.

### 4. Deploy Frontend

- [ ] Click "Create Static Site"
- [ ] Wait for deployment
- [ ] **Copy the frontend URL** (e.g., `https://essay-grading-frontend.onrender.com`)

## 🔗 Connect Frontend and Backend

### Update Backend CORS

- [ ] Go back to backend service
- [ ] Update environment variable:
  - `FRONTEND_URL` = (Frontend URL from Frontend Step 4)
- [ ] Service will auto-redeploy

## ✅ Post-Deployment Testing

### Test Public Access

- [ ] Visit frontend URL
- [ ] Enter a project code (will fail - that's expected, no projects yet)
- [ ] Check that API errors display properly

### Test Admin Access

- [ ] Go to `/login`
- [ ] Create admin account using your `ADMIN_SIGNUP_CODE`
- [ ] Should redirect to `/admin`
- [ ] Verify you can see the empty projects dashboard

### Create Test Project

- [ ] Click "Create Project"
- [ ] Fill in all fields with a test agent ID
- [ ] Save project
- [ ] Should appear in dashboard

### Test Student Flow

- [ ] Go to home page
- [ ] Enter your test project code
- [ ] Enter a name
- [ ] Write a short essay
- [ ] Try running a review (will call your Agent Builder agent)
- [ ] Verify review results appear
- [ ] Try final submission
- [ ] Go back to admin and verify submission appears

## 🐛 Troubleshooting

### Backend Health Check Fails

- [ ] Check build logs for errors
- [ ] Verify all environment variables are set
- [ ] Check database connection
- [ ] Review runtime logs

### Frontend Can't Reach Backend

- [ ] Verify `VITE_API_BASE` is set **in the build command**, not Environment tab
  - Build command should be: `VITE_API_BASE=https://your-backend.onrender.com/api npm install && npm run build`
- [ ] Check CORS configuration in backend
- [ ] Review browser console for specific errors
- [ ] Verify backend `FRONTEND_URL` matches actual frontend URL
- [ ] Verify backend has `trust proxy` set to `1` in production

### Database Connection Issues

- [ ] Confirm `DATABASE_URL` is the **internal** URL (not external)
- [ ] Check database is running
- [ ] Verify SSL settings if using external PostgreSQL

### Agent Calls Fail

- [ ] Check `OPENAI_API_KEY` is valid
- [ ] Verify agent IDs are correct format
- [ ] Review backend logs for OpenAI errors
- [ ] Test agent in OpenAI playground first

### Sessions Don't Persist

- [ ] Verify `SESSION_SECRET` is set
- [ ] Check `trust proxy` is set to `1` in backend code
- [ ] Verify cookies have `secure: true` and `sameSite: 'none'` in production
- [ ] Check backend logs to see if session ID is being created

### Authentication Doesn't Work in Incognito/Private Mode

**This is expected behavior** - most browsers block third-party cookies in incognito mode by default. Since the frontend and backend are on different domains, cookies are considered "third-party" and blocked.

**Workarounds:**

- [ ] Users can use regular (non-incognito) browser windows
- [ ] For testing, some browsers allow third-party cookies in settings
- [ ] For production, consider using same domain or subdomain setup (requires custom domain)

**Note:** This is a browser security feature, not an application bug.

### "Too Many Redirects" Error

- [ ] Check SPA rewrite rule is configured
- [ ] Verify it's set to "Rewrite" not "Redirect"
- [ ] Clear browser cache

## 🚀 Going Live

### Before Launch

- [ ] Change `ADMIN_SIGNUP_CODE` to something secure
- [ ] Set up real Agent Builder agents with proper prompts
- [ ] Test all flows thoroughly
- [ ] Consider upgrading to paid plans for better performance
- [ ] Set up monitoring/alerts in Render

### Custom Domain (Optional)

- [ ] In frontend service, go to "Settings" → "Custom Domain"
- [ ] Add your domain
- [ ] Update DNS records as instructed
- [ ] Update backend `FRONTEND_URL` to match

### Security Checklist

- [ ] Strong `SESSION_SECRET` (32+ random characters)
- [ ] Secure `ADMIN_SIGNUP_CODE` (for regular admins, not shared publicly)
- [ ] Secure `SUPER_ADMIN_CODE` (for super admin access, keep very private)
- [ ] HTTPS enabled (automatic with Render)
- [ ] CORS configured for specific domain (not wildcard)
- [ ] API key stored in environment variables (not in code)

### Admin Role System

This system uses two-tier admin access:

- **Regular Admins**: Create account with `ADMIN_SIGNUP_CODE`, can only see/manage their own projects
- **Super Admins**: Create account with `SUPER_ADMIN_CODE`, can see/manage all projects

To set up super admin after deployment:

1. Add `SUPER_ADMIN_CODE` environment variable in Render
2. Run migration: `psql $DATABASE_URL -f backend/src/db/migrations/add_super_admin.sql`
3. Create super admin account using the super admin code during signup

## 📊 Monitoring

After deployment, regularly check:

- [ ] Render service health dashboards
- [ ] Database usage and performance
- [ ] Application logs for errors
- [ ] API response times
- [ ] User feedback

## 💡 Tips

- **Free tier limitations**: Services sleep after 15 min of inactivity. Consider paid plan for production.
- **Database backups**: Enable automatic backups in Render for production.
- **Environment variables**: Changes trigger redeployment automatically.
- **Logs**: Check both build logs and runtime logs when debugging.
- **Deploy keys**: Render auto-generates; no manual setup needed.

## 📞 Support Resources

- Render Docs: https://render.com/docs
- OpenAI Docs: https://platform.openai.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/

---

✅ **Deployment Complete!** Your Agentic AI Learning platform is now live.
