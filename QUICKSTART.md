# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### Step 2: Set Up Database

```bash
# Create PostgreSQL database
createdb essay_grading

# Or using psql:
psql -U postgres
CREATE DATABASE essay_grading;
\q
```

### Step 3: Configure Environment

**Backend** - Create `backend/.env`:
```env
DATABASE_URL=postgresql://localhost:5432/essay_grading
SESSION_SECRET=my-secret-key-change-this
ADMIN_SIGNUP_CODE=demo123
OPENAI_API_KEY=sk-your-key-here
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** - No configuration needed for local dev (uses Vite proxy)

### Step 4: Initialize Database

```bash
cd backend
npm run db:migrate
```

### Step 5: Start Servers

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### Step 6: Create Admin Account

1. Open browser to `http://localhost:5173`
2. Click "Login" → "Create Account"
3. Enter:
   - Username: `admin`
   - Password: `password123`
   - Access Code: `demo123` (from your .env)

### Step 7: Create a Test Project

1. Click "Create Project"
2. Fill in:
   - Code: `TEST01`
   - Title: `Test Essay Project`
   - Description: (default is fine)
   - Word Limit: `150`
   - Attempts: `3`
   - AI Mode: `Agent A`
   - Agent A ID: `asst_xxxxx` (your Agent Builder agent ID)

### Step 8: Test as Student

1. Go to home page
2. Enter code: `TEST01`
3. Enter your name
4. Write an essay
5. Try AI reviews
6. Submit final essay

## 📝 Important Notes

### Agent Builder Setup

Before the AI features work, you need to:

1. Create an Assistant in OpenAI Agent Builder
2. Configure it to accept essay grading prompts
3. Copy the assistant ID (starts with `asst_`)
4. Use this ID when creating projects

### Two AI Modes

- **Agent A**: One agent handles all categories (grammar, structure, style, content)
- **Agent B**: Four separate specialized agents, one per category

### Database Reset

If you need to start fresh:

```bash
# Drop and recreate database
dropdb essay_grading
createdb essay_grading
cd backend && npm run db:migrate
```

## 🔍 Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `psql -U postgres -c "SELECT 1"`
- Verify DATABASE_URL in `.env`

### Frontend can't reach API
- Ensure backend is running on port 3000
- Check browser console for CORS errors

### Agent calls fail
- Verify OPENAI_API_KEY is valid
- Check agent ID is correct format (`asst_xxx`)
- Review backend logs for detailed errors

### Sessions don't persist
- Check SESSION_SECRET is set
- Verify session table exists in database

## 📚 Next Steps

1. Read the full [README.md](README.md) for detailed documentation
2. Review the API endpoints in backend routes
3. Customize styling in `frontend/src/index.css`
4. Configure real Agent Builder agents for production

## 🌐 Production Deployment

See [README.md](README.md) section on "Deployment (Render)" for full instructions on deploying to Render.com.

Key points:
- Deploy backend as Web Service
- Deploy frontend as Static Site
- Set environment variables in Render dashboard
- Configure database connection
- Set up SPA rewrite rules for frontend
