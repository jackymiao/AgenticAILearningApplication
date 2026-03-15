import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";
import dotenv from "dotenv";
import {Pool} from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(backendRoot, "..");

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

function rowsToCsv(rows, columns) {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => csvEscape(row[col])).join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

async function main() {
  const projectCodeInput = process.argv[2];
  const outputArg = process.argv[3];

  if (!projectCodeInput) {
    console.error(
      "Usage: node scripts/export-project-submissions.js <PROJECT_CODE> [OUTPUT_DIR]",
    );
    process.exit(1);
  }

  const projectCode = normalizeProjectCode(projectCodeInput);
  const outputDir = outputArg
    ? path.resolve(outputArg)
    : path.join(
        workspaceRoot,
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
      `SELECT code, title
       FROM projects
       WHERE code = $1`,
      [projectCode],
    );

    if (projectResult.rows.length === 0) {
      console.error(`Project not found: ${projectCode}`);
      process.exit(1);
    }

    const submissionsRes = await pool.query(
      `SELECT
         project_code,
         user_name,
         essay,
         submitted_at
       FROM submissions
       WHERE project_code = $1
       ORDER BY user_name ASC`,
      [projectCode],
    );

    if (submissionsRes.rowCount === 0) {
      console.error(`No submissions found for project: ${projectCode}`);
      process.exit(1);
    }

    const contentAttemptsRes = await pool.query(
      `SELECT
         user_name,
         user_name_norm,
         attempt_number,
         category,
         status,
         essay_snapshot,
         created_at
       FROM review_attempts
       WHERE project_code = $1
         AND category = 'content'
       ORDER BY user_name ASC, created_at ASC`,
      [projectCode],
    );

    const contentByUser = new Map();
    let maxAttempts = 0;
    for (const row of contentAttemptsRes.rows) {
      if (!contentByUser.has(row.user_name)) {
        contentByUser.set(row.user_name, []);
      }
      contentByUser.get(row.user_name).push({
        attempt_number: row.attempt_number,
        category: row.category,
        status: row.status,
        essay_snapshot: row.essay_snapshot,
        created_at: row.created_at,
      });

      if (Number(row.attempt_number) > maxAttempts) {
        maxAttempts = Number(row.attempt_number);
      }
    }

    const outputRows = submissionsRes.rows.map((submission) => {
      const row = {
        project_code: submission.project_code,
        user_name: submission.user_name,
        essay: submission.essay,
        submitted_at: submission.submitted_at,
      };

      const attempts = contentByUser.get(submission.user_name) || [];
      const attemptsByNumber = new Map();
      for (const attempt of attempts) {
        attemptsByNumber.set(Number(attempt.attempt_number), attempt);
      }

      for (let i = 1; i <= maxAttempts; i++) {
        const attempt = attemptsByNumber.get(i);
        row[`attempt_${i}_number`] = attempt ? attempt.attempt_number : "N/A";
        row[`attempt_${i}_status`] = attempt ? attempt.status : "N/A";
        row[`attempt_${i}_essay_snapshot`] = attempt
          ? attempt.essay_snapshot
          : "N/A";
        row[`attempt_${i}_created_at`] = attempt ? attempt.created_at : "N/A";
      }

      return row;
    });

    const columns = ["project_code", "user_name", "essay", "submitted_at"];
    for (let i = 1; i <= maxAttempts; i++) {
      columns.push(
        `attempt_${i}_number`,
        `attempt_${i}_status`,
        `attempt_${i}_essay_snapshot`,
        `attempt_${i}_created_at`,
      );
    }

    const csv = rowsToCsv(outputRows, columns);
    const outputFile = path.join(outputDir, "submissions-with-drafts.csv");
    await fs.writeFile(outputFile, csv, "utf8");

    console.log("Submissions export completed successfully.");
    console.log(`Project: ${projectCode} (${projectResult.rows[0].title})`);
    console.log(`Output file: ${outputFile}`);
    console.log(`Rows exported: ${outputRows.length}`);
  } catch (error) {
    console.error("Export failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
