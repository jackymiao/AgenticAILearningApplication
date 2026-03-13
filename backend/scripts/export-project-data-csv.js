import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";
import dotenv from "dotenv";
import {Pool} from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");

function normalizeProjectCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows, explicitColumns = null) {
  const columns =
    explicitColumns && explicitColumns.length > 0
      ? explicitColumns
      : Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => csvEscape(row[col])).join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

async function writeCsv(outDir, fileName, rows, explicitColumns = null) {
  const csv = rowsToCsv(rows, explicitColumns);
  const fullPath = path.join(outDir, fileName);
  await fs.writeFile(fullPath, csv, "utf8");
  return fullPath;
}

async function main() {
  const projectCodeInput = process.argv[2];
  const outputArg = process.argv[3];

  if (!projectCodeInput) {
    console.error(
      "Usage: node scripts/export-project-data-csv.js <PROJECT_CODE> [OUTPUT_DIR]",
    );
    process.exit(1);
  }

  const projectCode = normalizeProjectCode(projectCodeInput);
  const outputDir = outputArg
    ? path.resolve(outputArg)
    : path.join(
        backendRoot,
        "exports",
        `${projectCode}_${new Date().toISOString().slice(0, 10)}`,
      );

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Please configure it in backend/.env",
    );
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? {rejectUnauthorized: false}
        : false,
  });

  try {
    await fs.mkdir(outputDir, {recursive: true});

    const projectResult = await pool.query(
      `SELECT code, title, created_at
       FROM projects
       WHERE code = $1`,
      [projectCode],
    );

    if (projectResult.rows.length === 0) {
      console.error(`Project not found: ${projectCode}`);
      process.exit(1);
    }

    const [
      reviewAttemptsRes,
      editorSessionsRes,
      attacksRes,
      submissionsRes,
      playerStateRes,
      feedbackRes,
      timelineRes,
    ] = await Promise.all([
      pool.query(
        `SELECT
           id,
           project_code,
           user_name,
           user_name_norm,
           category,
           attempt_number,
           status,
           score,
           final_score,
           essay_snapshot,
           created_at
         FROM review_attempts
         WHERE project_code = $1
         ORDER BY user_name_norm, created_at`,
        [projectCode],
      ),
      pool.query(
        `SELECT
           id,
           project_code,
           user_name_norm,
           session_id,
           event_type,
           timestamp,
           duration_ms,
           essay_length,
           current_attempt_number,
           created_at
         FROM editor_sessions
         WHERE project_code = $1
         ORDER BY timestamp`,
        [projectCode],
      ),
      pool.query(
        `SELECT
           id,
           project_code,
           attacker_name,
           attacker_name_norm,
           target_name,
           target_name_norm,
           status,
           shield_used,
           created_at,
           responded_at,
           expires_at
         FROM attacks
         WHERE project_code = $1
         ORDER BY created_at`,
        [projectCode],
      ),
      pool.query(
        `SELECT
           id,
           project_code,
           user_name,
           user_name_norm,
           essay,
           submitted_at,
           admin_score,
           admin_feedback,
           updated_at
         FROM submissions
         WHERE project_code = $1
         ORDER BY submitted_at`,
        [projectCode],
      ),
      pool.query(
        `SELECT
           id,
           project_code,
           user_name,
           user_name_norm,
           review_tokens,
           attack_tokens,
           shield_tokens,
           has_submitted_first_review,
           last_review_at,
           created_at,
           updated_at
         FROM player_state
         WHERE project_code = $1
         ORDER BY user_name_norm`,
        [projectCode],
      ),
      pool.query(
        `SELECT
           id,
           project_code,
           content_rating,
           system_design_rating,
           response_quality_rating,
           comment,
           submitted_at,
           submission_hash
         FROM project_feedback
         WHERE project_code = $1
         ORDER BY submitted_at`,
        [projectCode],
      ),
      pool.query(
        `SELECT
           event_type,
           timestamp,
           user_name_norm,
           attempt_number,
           category,
           status,
           data_size
         FROM (
           SELECT
             'draft_snapshot'::text as event_type,
             ra.created_at as timestamp,
             ra.user_name_norm,
             ra.attempt_number,
             ra.category,
             ra.status,
             LENGTH(ra.essay_snapshot)::int as data_size
           FROM review_attempts ra
           WHERE ra.project_code = $1

           UNION ALL

           SELECT
             'editor_session'::text as event_type,
             es.created_at as timestamp,
             es.user_name_norm,
             es.current_attempt_number as attempt_number,
             es.event_type as category,
             NULL::text as status,
             es.duration_ms as data_size
           FROM editor_sessions es
           WHERE es.project_code = $1

           UNION ALL

           SELECT
             'game_event'::text as event_type,
             a.created_at as timestamp,
             a.attacker_name_norm as user_name_norm,
             NULL::int as attempt_number,
             CASE WHEN a.shield_used THEN 'shield' ELSE 'steal' END as category,
             a.status,
             1::int as data_size
           FROM attacks a
           WHERE a.project_code = $1

           UNION ALL

           SELECT
             'final_submission'::text as event_type,
             s.submitted_at as timestamp,
             s.user_name_norm,
             NULL::int as attempt_number,
             'submission'::text as category,
             NULL::text as status,
             LENGTH(s.essay)::int as data_size
           FROM submissions s
           WHERE s.project_code = $1
         ) combined
         ORDER BY timestamp, user_name_norm`,
        [projectCode],
      ),
    ]);

    const files = await Promise.all([
      writeCsv(outputDir, "review_attempts.csv", reviewAttemptsRes.rows),
      writeCsv(outputDir, "editor_sessions.csv", editorSessionsRes.rows),
      writeCsv(outputDir, "attacks.csv", attacksRes.rows),
      writeCsv(outputDir, "submissions.csv", submissionsRes.rows),
      writeCsv(outputDir, "player_state.csv", playerStateRes.rows),
      writeCsv(outputDir, "project_feedback.csv", feedbackRes.rows),
      writeCsv(outputDir, "activity_timeline.csv", timelineRes.rows),
      writeCsv(outputDir, "project_info.csv", projectResult.rows),
    ]);

    console.log("CSV export completed successfully.");
    console.log(`Project: ${projectCode} (${projectResult.rows[0].title})`);
    console.log(`Output directory: ${outputDir}`);
    console.log("Files generated:");
    files.forEach((f) => console.log(`- ${f}`));
    console.log("Row counts:");
    console.log(`- review_attempts: ${reviewAttemptsRes.rowCount}`);
    console.log(`- editor_sessions: ${editorSessionsRes.rowCount}`);
    console.log(`- attacks: ${attacksRes.rowCount}`);
    console.log(`- submissions: ${submissionsRes.rowCount}`);
    console.log(`- player_state: ${playerStateRes.rowCount}`);
    console.log(`- project_feedback: ${feedbackRes.rowCount}`);
    console.log(`- activity_timeline: ${timelineRes.rowCount}`);
  } catch (error) {
    console.error("Export failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
