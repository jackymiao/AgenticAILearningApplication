import crypto from "crypto";
import dotenv from "dotenv";
import {Pool} from "pg";

dotenv.config();

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Riley",
  "Avery",
  "Parker",
  "Cameron",
  "Skyler",
  "Sam",
  "Jamie",
  "Drew",
  "Logan",
  "Quinn",
  "Harper",
  "Bailey",
  "Rowan",
  "Elliot",
  "Finley",
  "Remy",
  "Sage",
  "Reese",
  "Dakota",
  "Kendall",
  "Sawyer",
  "Noel",
  "Ari",
  "Milan",
  "River",
];

const LAST_NAMES = [
  "Chen",
  "Wang",
  "Li",
  "Zhang",
  "Liu",
  "Yang",
  "Huang",
  "Zhao",
  "Wu",
  "Zhou",
  "Lin",
  "Xu",
  "Sun",
  "Ma",
  "Zhu",
  "Hu",
  "Gao",
  "Guo",
  "He",
  "Luo",
  "Tang",
  "Song",
  "Deng",
  "Cao",
  "Peng",
  "Shen",
  "Yuan",
  "Qin",
  "Su",
  "Han",
];

const TOPICS = [
  "sustainable urban mobility",
  "ethical use of generative AI in education",
  "community-based climate adaptation",
  "digital well-being for teenagers",
  "food waste reduction in cities",
  "privacy-aware smart campus design",
  "inclusive public service design",
  "remote collaboration in engineering teams",
];

const SENTENCES = [
  "The issue appears simple at first glance, but practical constraints reveal hidden trade-offs.",
  "A strong solution should balance technical feasibility with social acceptance and long-term impact.",
  "Evidence from pilot programs suggests that early user feedback improves implementation quality.",
  "Policy design matters because incentives shape behavior more consistently than one-time campaigns.",
  "When stakeholders define success differently, teams need transparent criteria before making decisions.",
  "Small process changes can compound into measurable gains over one semester.",
  "Students often report better outcomes when reflection is integrated into iterative drafting.",
  "Data quality is as important as model choice when evaluating intervention effectiveness.",
  "A phased rollout reduces risk and creates checkpoints for course correction.",
  "Clear communication helps teams convert abstract goals into observable milestones.",
  "Comparative analysis shows that context-sensitive strategies outperform one-size-fits-all approaches.",
  "The proposed framework emphasizes reliability, fairness, and continuous improvement.",
];

function normalizeUserName(name) {
  return name.trim().toLowerCase();
}

function normalizeProjectCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function sampleWithoutReplacement(arr, count) {
  const copy = [...arr];
  const out = [];
  while (copy.length > 0 && out.length < count) {
    out.push(copy.splice(randomInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}

function generateProjectCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += chars[randomInt(0, chars.length - 1)];
  return code;
}

function randomDateWithinDays(daysBack) {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(randomInt(past, now));
}

function generateEssay(userName) {
  const topic = randomChoice(TOPICS);
  const wordsTarget = 500;
  const opening = [
    `${userName} argues that ${topic} requires both systems thinking and practical iteration.`,
    `This essay examines ${topic} through feasibility, equity, and measurable outcomes.`,
    `In this discussion, the central claim is that thoughtful design can improve ${topic}.`,
  ];

  const words = [];
  words.push(...randomChoice(opening).split(" "));

  while (words.length < wordsTarget) {
    words.push(...randomChoice(SENTENCES).split(" "));
  }

  return words.slice(0, wordsTarget).join(" ");
}

function gradeFromAttempt(attemptNumber) {
  const base = 62 + attemptNumber * 5;
  return Math.min(98, base + randomInt(-4, 6));
}

async function ensureUniqueProjectCode(pool) {
  for (let i = 0; i < 50; i += 1) {
    const code = generateProjectCode();
    const exists = await pool.query("SELECT 1 FROM projects WHERE code = $1", [
      code,
    ]);
    if (exists.rows.length === 0) return code;
  }
  throw new Error("Failed to generate unique project code after many attempts");
}

function parseArgs(argv) {
  const parsed = {
    dbUrl: "",
    projectCode: "",
    wipe: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--wipe") {
      parsed.wipe = true;
      continue;
    }

    if (arg.startsWith("--projectCode=")) {
      parsed.projectCode = arg.split("=")[1] || "";
      continue;
    }

    if (arg === "--projectCode") {
      parsed.projectCode = argv[i + 1] || "";
      i += 1;
      continue;
    }

    if (arg.startsWith("--dbUrl=")) {
      parsed.dbUrl = arg.split("=")[1] || "";
      continue;
    }

    if (arg === "--dbUrl") {
      parsed.dbUrl = argv[i + 1] || "";
      i += 1;
      continue;
    }

    // Backward compatibility: first positional arg is DB URL
    if (!arg.startsWith("--") && !parsed.dbUrl) {
      parsed.dbUrl = arg;
    }
  }

  return parsed;
}

async function wipeProjectData(client, projectCode) {
  // Delete children first to preserve FK integrity.
  await client.query("DELETE FROM review_attempts WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM editor_sessions WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM attacks WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM submissions WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM player_state WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM project_students WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM project_feedback WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM ai_detections WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query(
    "DELETE FROM missing_category_errors WHERE project_code = $1",
    [projectCode],
  );
  await client.query("DELETE FROM active_sessions WHERE project_code = $1", [
    projectCode,
  ]);
  await client.query("DELETE FROM projects WHERE code = $1", [projectCode]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbUrl = (args.dbUrl || "").trim() || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error(
      "Missing DB URL. Usage: node scripts/generate-fake-project-data.js <DATABASE_URL> [--projectCode ABC123] [--wipe]",
    );
    process.exit(1);
  }

  const pool = new Pool({connectionString: dbUrl});

  const config = {
    students: 80,
    attemptsMin: 3,
    attemptsMax: 5,
    feedbackRatio: 0.6,
    daysBack: 7,
    reviewCooldownSeconds: 120,
    wordLimit: 600,
  };

  const stats = {
    projectCode: "",
    projectTitle: "",
    students: 0,
    reviewAttempts: 0,
    editorEvents: 0,
    attacks: 0,
    submissions: 0,
    feedback: 0,
  };

  try {
    let projectCode = "";
    if (args.projectCode) {
      projectCode = normalizeProjectCode(args.projectCode);
      if (!/^[A-Z0-9]{6}$/.test(projectCode)) {
        throw new Error(
          "--projectCode must be exactly 6 alphanumeric characters",
        );
      }

      const existing = await pool.query(
        "SELECT 1 FROM projects WHERE code = $1",
        [projectCode],
      );
      if (existing.rows.length > 0) {
        if (!args.wipe) {
          throw new Error(
            `Project ${projectCode} already exists. Use --wipe to clean and reseed this project code.`,
          );
        }
      }
    } else {
      projectCode = await ensureUniqueProjectCode(pool);
    }

    const projectTitle = `Synthetic Learning Project ${projectCode}`;
    stats.projectCode = projectCode;
    stats.projectTitle = projectTitle;

    await pool.query("BEGIN");

    if (args.wipe) {
      await wipeProjectData(pool, projectCode);
    }

    await pool.query(
      `INSERT INTO projects (
        code, title, description, project_password_hash, youtube_url,
        word_limit, attempt_limit_per_category, enabled,
        review_cooldown_seconds, enable_feedback, test_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, TRUE, TRUE)`,
      [
        projectCode,
        projectTitle,
        "Auto-generated synthetic dataset for analytics validation.",
        "synthetic_password_hash",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        config.wordLimit,
        config.attemptsMax,
        config.reviewCooldownSeconds,
      ],
    );

    const usedNames = new Set();
    const students = [];
    while (students.length < config.students) {
      const name = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      const userNameNorm = normalizeUserName(name);
      const studentId =
        `${name.split(" ")[0].slice(0, 1)}${name.split(" ")[1].slice(0, 1)}${String(randomInt(1000, 9999))}`.toUpperCase();
      students.push({
        name,
        userNameNorm,
        studentId,
        studentIdNorm: studentId.toUpperCase(),
      });
    }

    for (const s of students) {
      await pool.query(
        `INSERT INTO project_students (project_code, student_name, student_name_norm, student_id, student_id_norm)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectCode, s.name, s.userNameNorm, s.studentId, s.studentIdNorm],
      );

      await pool.query(
        `INSERT INTO player_state (project_code, user_name, user_name_norm, review_tokens, attack_tokens, shield_tokens, has_submitted_first_review)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [
          projectCode,
          s.name,
          s.userNameNorm,
          randomInt(0, 2),
          randomInt(0, 1),
          randomInt(0, 1),
        ],
      );
    }

    stats.students = students.length;

    for (const s of students) {
      const attempts = randomInt(config.attemptsMin, config.attemptsMax);
      const essay = generateEssay(s.name);

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const createdAt = randomDateWithinDays(config.daysBack);
        const categories = ["content", "structure", "mechanics"];
        const scores = categories.map(() => gradeFromAttempt(attempt));
        const finalScore = Number(
          (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
        );

        for (let i = 0; i < categories.length; i += 1) {
          const category = categories[i];
          const score = scores[i];
          const resultJson = {
            score,
            overview: {
              good: ["Argument clarity improved compared with previous draft."],
              improve: ["Use stronger evidence and more precise transitions."],
            },
            suggestions: ["Add one concrete example and tighten conclusion."],
          };

          await pool.query(
            `INSERT INTO review_attempts (
              project_code, user_name, user_name_norm, category, attempt_number,
              essay_snapshot, status, score, final_score, result_json, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'success', $7, $8, $9, $10)`,
            [
              projectCode,
              s.name,
              s.userNameNorm,
              category,
              attempt,
              essay,
              score,
              finalScore,
              JSON.stringify(resultJson),
              createdAt,
            ],
          );
          stats.reviewAttempts += 1;
        }

        const sessionId = `sess_${projectCode}_${s.userNameNorm.replace(/\s+/g, "_")}_${attempt}`;
        const focusAt = new Date(
          createdAt.getTime() - randomInt(6, 20) * 60 * 1000,
        );
        const blurDuration = randomInt(120000, 2400000);
        const blurAt = new Date(focusAt.getTime() + blurDuration);

        await pool.query(
          `INSERT INTO editor_sessions (project_code, user_name_norm, session_id, event_type, timestamp, essay_length, current_attempt_number, created_at)
           VALUES ($1, $2, $3, 'focus', $4, $5, $6, $4)`,
          [
            projectCode,
            s.userNameNorm,
            `${sessionId}_f`,
            focusAt,
            randomInt(220, 520),
            attempt,
          ],
        );
        stats.editorEvents += 1;

        await pool.query(
          `INSERT INTO editor_sessions (project_code, user_name_norm, session_id, event_type, timestamp, duration_ms, essay_length, current_attempt_number, created_at)
           VALUES ($1, $2, $3, 'blur', $4, $5, $6, $7, $4)`,
          [
            projectCode,
            s.userNameNorm,
            `${sessionId}_b`,
            blurAt,
            blurDuration,
            randomInt(260, 560),
            attempt,
          ],
        );
        stats.editorEvents += 1;
      }

      const submittedAt = randomDateWithinDays(config.daysBack);
      await pool.query(
        `INSERT INTO submissions (project_code, user_name, user_name_norm, essay, submitted_at, admin_score, admin_feedback)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          projectCode,
          s.name,
          s.userNameNorm,
          essay,
          submittedAt,
          randomInt(68, 96),
          "Synthetic grading feedback for analytics testing.",
        ],
      );
      stats.submissions += 1;

      if (Math.random() < config.feedbackRatio) {
        const submissionHash = crypto
          .createHash("sha256")
          .update(`${projectCode}:${s.userNameNorm}`)
          .digest("hex");

        await pool.query(
          `INSERT INTO project_feedback (
            project_code, content_rating, system_design_rating, response_quality_rating,
            comment, submitted_at, submission_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (submission_hash) DO NOTHING`,
          [
            projectCode,
            randomInt(3, 5),
            randomInt(3, 5),
            randomInt(3, 5),
            "Synthetic feedback: interface is clear and the review loop is useful for iteration.",
            randomDateWithinDays(config.daysBack),
            submissionHash,
          ],
        );
        stats.feedback += 1;
      }
    }

    const attackCount = Math.floor(stats.students * 1.8);
    for (let i = 0; i < attackCount; i += 1) {
      const attacker = randomChoice(students);
      let target = randomChoice(students);
      while (target.userNameNorm === attacker.userNameNorm) {
        target = randomChoice(students);
      }

      const statuses = ["succeeded", "defended", "expired", "pending"];
      const status = randomChoice(statuses);
      const createdAt = randomDateWithinDays(config.daysBack);
      const shieldUsed = status === "defended" ? true : Math.random() < 0.2;
      const respondedAt =
        status === "pending"
          ? null
          : new Date(createdAt.getTime() + randomInt(30, 600) * 1000);
      const expiresAt = new Date(createdAt.getTime() + 2 * 60 * 1000);

      await pool.query(
        `INSERT INTO attacks (
          project_code, attacker_name, attacker_name_norm,
          target_name, target_name_norm,
          status, shield_used, created_at, responded_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          projectCode,
          attacker.name,
          attacker.userNameNorm,
          target.name,
          target.userNameNorm,
          status,
          shieldUsed,
          createdAt,
          respondedAt,
          expiresAt,
        ],
      );
      stats.attacks += 1;
    }

    await pool.query("COMMIT");

    console.log("Synthetic project created successfully.");
    console.log(`PROJECT_CODE=${stats.projectCode}`);
    console.log(`PROJECT_TITLE=${stats.projectTitle}`);
    console.log(`students=${stats.students}`);
    console.log(`review_attempt_rows=${stats.reviewAttempts}`);
    console.log(`editor_event_rows=${stats.editorEvents}`);
    console.log(`attack_rows=${stats.attacks}`);
    console.log(`submission_rows=${stats.submissions}`);
    console.log(`feedback_rows=${stats.feedback}`);
    if (args.wipe) {
      console.log("mode=wipe_and_reseed");
    }
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Generation failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
