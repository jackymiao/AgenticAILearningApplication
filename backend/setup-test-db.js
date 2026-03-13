import {Pool} from "pg";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DB_URL =
  "postgresql://neondb_owner:npg_64uacWjpSmnZ@ep-delicate-pine-ad43i2u2-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({connectionString: TEST_DB_URL});

const dbDir = path.join(__dirname, "src/db");

const editorSessionsSQL = `
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_editor_sessions_lookup ON editor_sessions(project_code, user_name_norm);
CREATE INDEX IF NOT EXISTS idx_editor_sessions_timestamp ON editor_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_editor_sessions_event ON editor_sessions(event_type);
`;

const testModeSQL = `ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT FALSE;`;

async function run() {
  const steps = [
    ["schema", fs.readFileSync(path.join(dbDir, "schema.sql"), "utf8")],
    [
      "cooldown",
      fs.readFileSync(path.join(dbDir, "add-review-cooldown.sql"), "utf8"),
    ],
    [
      "feedback",
      fs.readFileSync(path.join(dbDir, "add-project-feedback.sql"), "utf8"),
    ],
    [
      "ai_detection",
      fs.readFileSync(path.join(dbDir, "add-ai-detection-table.sql"), "utf8"),
    ],
    [
      "missing_category_errors",
      fs.readFileSync(
        path.join(dbDir, "migrate-missing-category-errors.sql"),
        "utf8",
      ),
    ],
    [
      "first_review_flag",
      fs.readFileSync(
        path.join(dbDir, "migrations/add_first_review_flag.sql"),
        "utf8",
      ),
    ],
    [
      "super_admin",
      fs.readFileSync(
        path.join(dbDir, "migrations/add_super_admin.sql"),
        "utf8",
      ),
    ],
    ["editor_sessions", editorSessionsSQL],
    ["test_mode", testModeSQL],
  ];

  for (const [name, sql] of steps) {
    try {
      await pool.query(sql);
      console.log("✅", name);
    } catch (e) {
      console.error("❌", name, "-", e.message);
    }
  }

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
  );
  console.log("\nTables:", tables.rows.map((r) => r.table_name).join(", "));

  const editorCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'editor_sessions' ORDER BY ordinal_position`,
  );
  console.log(
    "\neditor_sessions columns:",
    editorCols.rows.map((r) => r.column_name).join(", "),
  );

  const attackCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'attacks' ORDER BY ordinal_position`,
  );
  console.log(
    "attacks columns:",
    attackCols.rows.map((r) => r.column_name).join(", "),
  );

  const raCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'review_attempts' ORDER BY ordinal_position`,
  );
  console.log(
    "review_attempts columns:",
    raCols.rows.map((r) => r.column_name).join(", "),
  );

  const projectCols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' ORDER BY ordinal_position`,
  );
  console.log(
    "projects columns:",
    projectCols.rows.map((r) => r.column_name).join(", "),
  );

  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
