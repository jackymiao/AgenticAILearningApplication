# Agentic AI Learning

A full-stack essay grading application with AI-powered feedback using OpenAI Agent Builder agents.

## Features

### Public Features
- **Project Access**: Students enter a 6-character project code to access assignments
- **Video Embedding**: YouTube video instructions embedded in each project
- **Essay Submission**: Write essays with word count tracking
- **AI Review System**: Get AI feedback in 4 categories (grammar, structure, style, content)
- **Attempt Limits**: Controlled number of review attempts per category
- **Final Submission**: One-time final submission per student per project

### Admin Features
- **Secure Authentication**: Admin login with access code protected signup
- **Project Management**: Create and edit projects with custom settings
- **Two AI Modes**:
  - **Agent A**: Single agent handles all categories
  - **Agent B**: Separate specialized agents per category
- **Submission Review**: View all student submissions with sorting options
- **Manual Grading**: Score and provide feedback with autosave
- **Review History**: View all AI review attempts per submission

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Express.js (Node.js)
- **Database**: PostgreSQL
- **AI Integration**: OpenAI Agent Builder (Assistants API)
- **Authentication**: Express Session with bcrypt
- **Styling**: Vanilla CSS (no framework)

## Project Structure

```
AgenticAILearning/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql          # Database schema
│   │   │   ├── index.js            # DB connection
│   │   │   └── migrate.js          # Migration runner
│   │   ├── routes/
│   │   │   ├── auth.js             # Authentication routes
│   │   │   ├── public.js           # Public API routes
│   │   │   └── admin.js            # Admin API routes
│   │   ├── services/
│   │   │   ├── auth.js             # Auth service
│   │   │   └── agentBuilder.js     # AI agent integration
│   │   ├── middleware/
│   │   │   └── auth.js             # Auth middleware
│   │   └── index.js                # Main server file
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js           # API client wrapper
    │   │   └── endpoints.js        # API endpoints
    │   ├── components/
    │   │   ├── PageContainer.jsx   # Layout wrapper
    │   │   └── Navigation.jsx      # Top navigation
    │   ├── pages/
    │   │   ├── HomePage.jsx        # Project code entry
    │   │   ├── ProjectPage.jsx     # Essay submission page
    │   │   ├── LoginPage.jsx       # Admin login
    │   │   ├── HelpPage.jsx        # Help documentation
    │   │   └── admin/
    │   │       ├── AdminDashboard.jsx
    │   │       ├── CreateProject.jsx
    │   │       ├── EditProject.jsx
    │   │       ├── SubmissionsList.jsx
    │   │       └── SubmissionDetail.jsx
    │   ├── store/
    │   │   └── AuthContext.jsx     # Auth state management
    │   ├── App.jsx                 # Main app with routing
    │   ├── main.jsx                # React entry point
    │   └── index.css               # Global styles
    ├── package.json
    └── .env.example
```

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- OpenAI API key with Agent Builder access

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Update the following variables:
     ```
     DATABASE_URL=postgresql://username:password@localhost:5432/essay_grading
     SESSION_SECRET=your-secure-random-string
     ADMIN_SIGNUP_CODE=your-access-code-for-admins
     OPENAI_API_KEY=your-openai-api-key
     ```

4. **Create database**:
   ```bash
   psql -U postgres
   CREATE DATABASE essay_grading;
   \q
   ```

5. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

Backend will run on `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional for local dev):
   - Copy `.env.example` to `.env` if needed
   - For local development, the Vite proxy handles API calls

4. **Start development server**:
   ```bash
   npm run dev
   ```

Frontend will run on `http://localhost:5173`

## Usage

### For Admins

1. **First Time Setup**:
   - Go to `/login`
   - Click "Create Account"
   - Enter username, password, and the access code from your `.env`

2. **Create a Project**:
   - Click "Create Project" on dashboard
   - Enter project details:
     - 6-character project code (e.g., `ABC123`)
     - Title and description
     - YouTube video URL (optional)
     - Word limit and attempt limits
     - Choose AI mode and provide agent ID(s)

3. **View Submissions**:
   - Click "View Submissions" on any project
   - Sort submissions by various criteria
   - Click "View Details" to see full submission

4. **Grade Submissions**:
   - Enter score (0-100)
   - Provide written feedback
   - Changes autosave while typing
   - Click "Save Now" for immediate save

### For Students

1. **Access Project**:
   - Go to homepage
   - Enter the 6-character project code

2. **Submit Name**:
   - Enter your name
   - Click "Continue"

3. **Write Essay**:
   - Watch the embedded video if provided
   - Write your essay in the text area
   - Monitor word count

4. **Get AI Reviews**:
   - Switch between category tabs (Grammar, Structure, Style, Content)
   - Click "Run Review" to get AI feedback
   - Review previous attempts in each category
   - Note: Limited attempts per category

5. **Final Submission**:
   - When satisfied, click "Submit Final Essay"
   - Confirm submission (cannot be undone)

## Database Schema

### Tables

- **admin_users**: Admin accounts with bcrypt hashed passwords
- **projects**: Project configurations with agent IDs
- **submissions**: Final essay submissions from students
- **review_attempts**: AI review attempts with results
- **session**: Express session storage

### Key Constraints

- Project codes are unique and uppercase
- User names are normalized (lowercase, trimmed)
- One final submission per (project_code, user_name_norm)
- Unique attempts per (project_code, user_name_norm, category, attempt_number)

## AI Integration

The system supports two agent modes:

### Agent A Mode
- Uses a single Agent Builder agent for all categories
- Backend passes the category as context
- Simpler configuration

### Agent B Mode  
- Uses four separate specialized agents
- One agent each for: grammar, structure, style, content
- More targeted feedback per category

### Agent Requirements

Agents should:
- Accept parameters: userName, essay, category, attemptNumber, projectCode
- Return JSON with feedback
- Optionally include a numeric score

## Deployment (Render)

### Backend Deployment

1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment Variables**: Set all variables from `.env.example`

4. Add PostgreSQL database:
   - Create a PostgreSQL instance on Render
   - Copy the internal database URL to `DATABASE_URL`

5. Run migration:
   - Use Render shell or one-time job: `npm run db:migrate`

### Frontend Deployment

1. Create a new **Static Site** on Render
2. Configure:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

3. Set environment variable:
   - `VITE_API_BASE`: Your backend URL (e.g., `https://your-backend.onrender.com/api`)

4. Add rewrite rule for SPA:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`

### CORS Configuration

For production with separate domains:
- Update backend CORS settings in `src/index.js`
- Set `FRONTEND_URL` environment variable
- Configure cookies with `SameSite=None; Secure`

## Development Notes

### API Endpoints

**Public**:
- `GET /api/public/projects/:code` - Get project info
- `GET /api/public/projects/:code/user-state` - Get user state
- `POST /api/public/projects/:code/reviews` - Submit review request
- `POST /api/public/projects/:code/submissions/final` - Final submission

**Auth**:
- `POST /api/auth/admin/signup` - Create admin account
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/me` - Get current session
- `POST /api/auth/logout` - Logout

**Admin** (requires authentication):
- `GET /api/admin/projects` - List all projects
- `POST /api/admin/projects` - Create project
- `GET /api/admin/projects/:code` - Get project details
- `PUT /api/admin/projects/:code` - Update project
- `GET /api/admin/projects/:code/submissions` - List submissions
- `GET /api/admin/submissions/:id` - Get submission details
- `PATCH /api/admin/submissions/:id/grading` - Update grading

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
