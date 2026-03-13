import {
  compareEssays,
  compareEssaysOptimized,
  compareWordCountOnly,
  generateEssay,
} from "./essay-comparison.mjs";
import {spawnSync} from "node:child_process";
import {mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    log(`✓ ${message}`, "green");
  } else {
    log(`✗ ${message}`, "red");
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ============================================
// CORRECTNESS TESTS
// ============================================

function runCorrectnessTests() {
  log("\n========== CORRECTNESS TESTS ==========", "blue");

  // Test 1: Identical essays (same text)
  log("\n[Test 1] Identical essays", "cyan");
  const essay1 = "The quick brown fox jumps over the lazy dog.";
  const essay2 = "The quick brown fox jumps over the lazy dog.";
  const result1 = compareEssays(essay1, essay2);
  assert(result1.areEqual === true, "Should detect identical essays");
  assert(result1.wordCount1 === 9, "Should count 9 words");
  log(`  Result: ${result1.message}`);

  // Test 2: Different punctuation but same words
  log("\n[Test 2] Same words, different punctuation", "cyan");
  const essay3 = "Hello, world! This is a test.";
  const essay4 = "Hello world. This is a test!";
  const result2 = compareEssays(essay3, essay4);
  assert(result2.areEqual === true, "Should ignore punctuation differences");
  log(`  Result: ${result2.message}`);

  // Test 3: Different spacing but same words
  log("\n[Test 3] Same words, different spacing", "cyan");
  const essay5 = "Hello    world    test";
  const essay6 = "Hello world test";
  const result3 = compareEssays(essay5, essay6);
  assert(result3.areEqual === true, "Should ignore spacing differences");
  log(`  Result: ${result3.message}`);

  // Test 4: Different word count
  log("\n[Test 4] Different word count", "cyan");
  const essay7 = "This is a short essay.";
  const essay8 = "This is a much longer essay with more words.";
  const result4 = compareEssays(essay7, essay8);
  assert(result4.areEqual === false, "Should detect different word counts");
  assert(result4.wordCount1 === 5, "Should count 5 words in first essay");
  assert(result4.wordCount2 === 9, "Should count 9 words in second essay");
  log(`  Result: ${result4.message}`);

  // Test 5: Same word count, different words
  log("\n[Test 5] Same word count, different words", "cyan");
  const essay9 = "The cat sat on the mat.";
  const essay10 = "The dog ran in the park.";
  const result5 = compareEssays(essay9, essay10);
  assert(result5.areEqual === false, "Should detect different words");
  assert(
    result5.differenceIndex !== null,
    "Should identify difference location",
  );
  log(`  Result: ${result5.message}`);
  log(`  First difference at word index: ${result5.differenceIndex}`);

  // Test 6: Case sensitivity
  log("\n[Test 6] Case insensitivity", "cyan");
  const essay11 = "HELLO WORLD";
  const essay12 = "hello world";
  const result6 = compareEssays(essay11, essay12);
  assert(result6.areEqual === true, "Should be case insensitive");
  log(`  Result: ${result6.message}`);

  log("\n✓ All correctness tests passed!", "green");
}

// ============================================
// OPTIMIZED FUNCTION TESTS
// ============================================

function runOptimizedFunctionTests() {
  log("\n========== OPTIMIZED FUNCTION TESTS ==========", "blue");

  // Test 1: Word count difference > 10 (should reject quickly)
  log("\n[Test 1] Large word count difference (>10)", "cyan");
  const essay1 = generateEssay(100);
  const essay2 = generateEssay(120); // 20 word difference
  const result1 = compareEssaysOptimized(essay1, essay2);
  assert(result1.areEqual === false, "Should reject when difference > 10");
  assert(
    result1.wordCountDifference === 20,
    "Should calculate correct difference",
  );
  log(`  Result: ${result1.message}`);

  // Test 2: Word count difference <= 10 but different
  log("\n[Test 2] Small word count difference (<=10)", "cyan");
  const essay3 = generateEssay(100);
  const essay4 = generateEssay(105); // 5 word difference
  const result2 = compareEssaysOptimized(essay3, essay4);
  assert(result2.areEqual === false, "Should still reject different counts");
  assert(
    result2.wordCountDifference === 5,
    "Should calculate correct difference",
  );
  log(`  Result: ${result2.message}`);

  // Test 3: Identical essays
  log("\n[Test 3] Identical essays", "cyan");
  const essay5 = generateEssay(500);
  const essay6 = generateEssay(500);
  const result3 = compareEssaysOptimized(essay5, essay6);
  assert(result3.areEqual === true, "Should detect identical essays");
  log(`  Result: ${result3.message}`);

  // Test 4: Edge case - exactly 10 word difference
  log("\n[Test 4] Exactly 10 word difference", "cyan");
  const essay7 = generateEssay(100);
  const essay8 = generateEssay(110);
  const result4 = compareEssaysOptimized(essay7, essay8);
  assert(
    result4.areEqual === false,
    "Should reject when difference is exactly 10",
  );
  assert(result4.wordCountDifference === 10, "Should be exactly 10 difference");
  log(`  Result: ${result4.message}`);

  // Test 5: Edge case - exactly 11 word difference (should use quick rejection)
  log("\n[Test 5] Exactly 11 word difference (quick rejection)", "cyan");
  const essay9 = generateEssay(100);
  const essay10 = generateEssay(111);
  const result5 = compareEssaysOptimized(essay9, essay10);
  assert(
    result5.areEqual === false,
    "Should quick reject when difference > 10",
  );
  assert(
    result5.message.includes("Quick rejection"),
    "Should use quick rejection path",
  );
  log(`  Result: ${result5.message}`);

  log("\n✓ All optimized function tests passed!", "green");
}

// ============================================
// PERFORMANCE COMPARISON
// ============================================

function runPerformanceComparison() {
  log("\n========== FUNCTION PERFORMANCE COMPARISON ==========", "blue");
  log("Comparing Original vs Optimized function performance\n", "cyan");

  const scenarios = [
    {
      name: "Large word count difference (500 vs 600 words)",
      essay1: generateEssay(500),
      essay2: generateEssay(600),
      description: "Testing quick rejection optimization",
    },
    {
      name: "Small word count difference (500 vs 505 words)",
      essay1: generateEssay(500),
      essay2: generateEssay(505),
      description: "Testing normal rejection path",
    },
    {
      name: "Identical 500-word essays",
      essay1: generateEssay(500),
      essay2: generateEssay(500),
      description: "Testing full word-by-word comparison",
    },
  ];

  const iterations = 10000;

  for (const scenario of scenarios) {
    log(`\n[${scenario.name}]`, "yellow");
    log(`  ${scenario.description}`, "cyan");

    // Test original function
    const timesOriginal = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      compareEssays(scenario.essay1, scenario.essay2);
      const end = performance.now();
      timesOriginal.push(end - start);
    }

    // Test optimized function
    const timesOptimized = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      compareEssaysOptimized(scenario.essay1, scenario.essay2);
      const end = performance.now();
      timesOptimized.push(end - start);
    }

    const avgOriginal =
      timesOriginal.reduce((a, b) => a + b, 0) / timesOriginal.length;
    const avgOptimized =
      timesOptimized.reduce((a, b) => a + b, 0) / timesOptimized.length;
    const speedup = avgOriginal / avgOptimized;
    const percentFaster = ((speedup - 1) * 100).toFixed(2);

    log(`\n  Original function:`, "reset");
    log(`    Average: ${avgOriginal.toFixed(4)} ms`, "reset");
    log(`  Optimized function:`, "reset");
    log(`    Average: ${avgOptimized.toFixed(4)} ms`, "reset");

    if (speedup > 1) {
      log(
        `  🚀 Optimized is ${speedup.toFixed(2)}x FASTER (${percentFaster}% improvement)`,
        "green",
      );
    } else if (speedup < 1) {
      log(
        `  ⚠️  Optimized is ${(1 / speedup).toFixed(2)}x SLOWER (${Math.abs(percentFaster)}% slower)`,
        "yellow",
      );
    } else {
      log(`  Same performance`, "reset");
    }
  }
}

// ============================================
// DWDIFF BENCHMARK
// ============================================

function runDwdiffBenchmark() {
  log("\n========== DWDIFF BENCHMARK ==========", "blue");

  const versionCheck = spawnSync("dwdiff", ["--version"], {encoding: "utf8"});
  if (versionCheck.error) {
    log("dwdiff is not installed. Skipping dwdiff benchmark.", "yellow");
    return;
  }

  const workDir = mkdtempSync(join(tmpdir(), "essay-dwdiff-"));
  const fileA = join(workDir, "essay-a.txt");
  const fileB = join(workDir, "essay-b.txt");

  const scenarios = [
    {
      name: "Identical 500-word essays",
      essay1: generateEssay(500),
      essay2: generateEssay(500),
      expectedSame: true,
    },
    {
      name: "Different 500-word essays",
      essay1: generateEssay(500),
      essay2: "different " + generateEssay(499),
      expectedSame: false,
    },
  ];

  const iterations = 200;

  try {
    for (const scenario of scenarios) {
      writeFileSync(fileA, scenario.essay1, "utf8");
      writeFileSync(fileB, scenario.essay2, "utf8");

      const dwdiffCheck = spawnSync("dwdiff", [fileA, fileB], {
        encoding: "utf8",
        stdio: "ignore",
      });
      const dwdiffSame = dwdiffCheck.status === 0;
      const dwdiffCorrect = dwdiffSame === scenario.expectedSame;

      const times = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        spawnSync("dwdiff", [fileA, fileB], {
          encoding: "utf8",
          stdio: "ignore",
        });
        const end = performance.now();
        times.push(end - start);
      }

      const avgDwdiff = times.reduce((a, b) => a + b, 0) / times.length;

      const inCodeStart = performance.now();
      const inCodeResult = compareEssaysOptimized(
        scenario.essay1,
        scenario.essay2,
      );
      const inCodeEnd = performance.now();

      log(`\n[${scenario.name}]`, "yellow");
      log(
        `  dwdiff avg time (spawn + compare): ${avgDwdiff.toFixed(4)} ms`,
        "reset",
      );
      log(
        `  compareEssaysOptimized time:       ${(inCodeEnd - inCodeStart).toFixed(4)} ms`,
        "reset",
      );
      log(
        `  dwdiff accuracy: ${dwdiffCorrect ? "CORRECT" : "WRONG"} (${dwdiffSame ? "SAME" : "NOT SAME"})`,
        dwdiffCorrect ? "green" : "red",
      );
      log(
        `  optimized accuracy: ${inCodeResult.areEqual === scenario.expectedSame ? "CORRECT" : "WRONG"}`,
        inCodeResult.areEqual === scenario.expectedSame ? "green" : "red",
      );
    }

    log(
      "\nNote: dwdiff includes process spawn + file I/O overhead, so it is usually much slower for server request paths.",
      "cyan",
    );
  } finally {
    rmSync(workDir, {recursive: true, force: true});
  }
}

// ============================================
// PERFORMANCE TESTS
// ============================================

function runPerformanceTests() {
  log("\n========== PERFORMANCE TESTS ==========", "blue");

  const wordCounts = [100, 250, 500, 1000];
  const iterations = 1000; // Number of times to run each test

  log(`\nTesting comparison speed with ${iterations} iterations per test\n`);

  for (const wordCount of wordCounts) {
    log(`[Testing ${wordCount}-word essays]`, "cyan");

    // Generate test essays
    const testEssay1 = generateEssay(wordCount);
    const testEssay2 = generateEssay(wordCount);

    const times = [];

    // Run multiple iterations
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      compareEssays(testEssay1, testEssay2);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const medianTime = times.sort((a, b) => a - b)[
      Math.floor(times.length / 2)
    ];

    log(`  Average time: ${avgTime.toFixed(4)} ms`, "yellow");
    log(`  Median time:  ${medianTime.toFixed(4)} ms`);
    log(`  Min time:     ${minTime.toFixed(4)} ms`);
    log(`  Max time:     ${maxTime.toFixed(4)} ms`);
    log(`  Total time:   ${times.reduce((a, b) => a + b, 0).toFixed(2)} ms\n`);
  }

  // Special focus on 500-word essays
  log("\n========== DETAILED 500-WORD ESSAY ANALYSIS ==========", "blue");

  const essay500_1 = generateEssay(500);
  const essay500_2 = generateEssay(500);
  const iterations500 = 10000; // More iterations for better accuracy
  const times500 = [];

  log(`Running ${iterations500} iterations for 500-word essays...\n`);

  for (let i = 0; i < iterations500; i++) {
    const startTime = performance.now();
    compareEssays(essay500_1, essay500_2);
    const endTime = performance.now();
    times500.push(endTime - startTime);
  }

  const avgTime500 = times500.reduce((a, b) => a + b, 0) / times500.length;
  const minTime500 = Math.min(...times500);
  const maxTime500 = Math.max(...times500);
  const medianTime500 = times500.sort((a, b) => a - b)[
    Math.floor(times500.length / 2)
  ];

  log(`Results for 500-word essay comparison:`, "cyan");
  log(`  Total iterations: ${iterations500}`, "yellow");
  log(`  Average time:     ${avgTime500.toFixed(4)} ms`, "yellow");
  log(`  Median time:      ${medianTime500.toFixed(4)} ms`);
  log(`  Min time:         ${minTime500.toFixed(4)} ms`);
  log(`  Max time:         ${maxTime500.toFixed(4)} ms`);
  log(
    `  Total time:       ${times500.reduce((a, b) => a + b, 0).toFixed(2)} ms`,
  );
  log(`  Comparisons/sec:  ${(1000 / avgTime500).toFixed(0)}`);
}

// ============================================
// ACCURACY COMPARISON
// ============================================

function runAccuracyComparison() {
  log("\n========== ACCURACY COMPARISON ==========", "blue");
  log("Testing which function gives the most accurate results\n", "cyan");

  // Create diverse test scenarios
  const testScenarios = [
    {
      name: "Identical 500-word essays",
      essay1: generateEssay(500),
      essay2: generateEssay(500),
      expectedSame: true,
      description: "Should detect as SAME",
    },
    {
      name: "Different 500-word essays (same length)",
      essay1: generateEssay(500),
      essay2: "different " + generateEssay(499), // 500 words but different content
      expectedSame: false,
      description: "Should detect as NOT SAME (word count alone fails here!)",
    },
    {
      name: "Similar essays, 5 word difference",
      essay1: generateEssay(500),
      essay2: generateEssay(505),
      expectedSame: false,
      description: "Should detect as NOT SAME",
    },
    {
      name: "Very different essays, 100 word difference",
      essay1: generateEssay(500),
      essay2: generateEssay(600),
      expectedSame: false,
      description: "Should detect as NOT SAME",
    },
    {
      name: "Paraphrased essay (same length, different words)",
      essay1: "The cat sat on the mat and looked around carefully.",
      essay2: "A dog ran in the park and played with friends.",
      expectedSame: false,
      description: "Should detect as NOT SAME (critical test!)",
    },
    {
      name: "Same essay with punctuation changes",
      essay1: "Hello, world! How are you today?",
      essay2: "Hello world. How are you today.",
      expectedSame: true,
      description: "Should detect as SAME",
    },
  ];

  const results = {
    original: {correct: 0, incorrect: 0, errors: []},
    optimized: {correct: 0, incorrect: 0, errors: []},
    wordCountOnly: {correct: 0, incorrect: 0, errors: []},
  };

  for (const scenario of testScenarios) {
    log(`\n[Test Scenario: ${scenario.name}]`, "yellow");
    log(`  Expected: ${scenario.expectedSame ? "SAME" : "NOT SAME"}`, "cyan");
    log(`  ${scenario.description}\n`);

    // Test original function
    const resultOriginal = compareEssays(scenario.essay1, scenario.essay2);
    const correctOriginal = resultOriginal.areEqual === scenario.expectedSame;
    if (correctOriginal) {
      results.original.correct++;
      log(`  ✓ Original: CORRECT - ${resultOriginal.message}`, "green");
    } else {
      results.original.incorrect++;
      results.original.errors.push(scenario.name);
      log(`  ✗ Original: WRONG - ${resultOriginal.message}`, "red");
    }

    // Test optimized function
    const resultOptimized = compareEssaysOptimized(
      scenario.essay1,
      scenario.essay2,
    );
    const correctOptimized = resultOptimized.areEqual === scenario.expectedSame;
    if (correctOptimized) {
      results.optimized.correct++;
      log(`  ✓ Optimized: CORRECT - ${resultOptimized.message}`, "green");
    } else {
      results.optimized.incorrect++;
      results.optimized.errors.push(scenario.name);
      log(`  ✗ Optimized: WRONG - ${resultOptimized.message}`, "red");
    }

    // Test word count only function
    const resultWordCount = compareWordCountOnly(
      scenario.essay1,
      scenario.essay2,
    );
    const correctWordCount = resultWordCount.areEqual === scenario.expectedSame;
    if (correctWordCount) {
      results.wordCountOnly.correct++;
      log(`  ✓ Word Count Only: CORRECT - ${resultWordCount.message}`, "green");
    } else {
      results.wordCountOnly.incorrect++;
      results.wordCountOnly.errors.push(scenario.name);
      log(`  ✗ Word Count Only: WRONG - ${resultWordCount.message}`, "red");
    }
  }

  // Display accuracy summary
  log("\n========== ACCURACY SUMMARY ==========", "blue");

  const totalTests = testScenarios.length;

  log(`\nOriginal Function:`, "cyan");
  log(
    `  Correct: ${results.original.correct}/${totalTests} (${((results.original.correct / totalTests) * 100).toFixed(1)}%)`,
    results.original.correct === totalTests ? "green" : "yellow",
  );
  if (results.original.incorrect > 0) {
    log(`  Failed on: ${results.original.errors.join(", ")}`, "red");
  }

  log(`\nOptimized Function:`, "cyan");
  log(
    `  Correct: ${results.optimized.correct}/${totalTests} (${((results.optimized.correct / totalTests) * 100).toFixed(1)}%)`,
    results.optimized.correct === totalTests ? "green" : "yellow",
  );
  if (results.optimized.incorrect > 0) {
    log(`  Failed on: ${results.optimized.errors.join(", ")}`, "red");
  }

  log(`\nWord Count Only Function:`, "cyan");
  log(
    `  Correct: ${results.wordCountOnly.correct}/${totalTests} (${((results.wordCountOnly.correct / totalTests) * 100).toFixed(1)}%)`,
    results.wordCountOnly.correct === totalTests ? "green" : "red",
  );
  if (results.wordCountOnly.incorrect > 0) {
    log(`  Failed on: ${results.wordCountOnly.errors.join(", ")}`, "red");
  }

  // Determine winner
  log("\n========== VERDICT ==========", "blue");
  const accuracies = [
    {name: "Original", score: results.original.correct},
    {name: "Optimized", score: results.optimized.correct},
    {name: "Word Count Only", score: results.wordCountOnly.correct},
  ];

  accuracies.sort((a, b) => b.score - a.score);

  log(`\n🏆 Most Accurate: ${accuracies[0].name} Function`, "green");
  log(
    `   ${accuracies[0].score}/${totalTests} correct (${((accuracies[0].score / totalTests) * 100).toFixed(1)}%)`,
    "green",
  );

  if (accuracies[0].score === accuracies[1].score) {
    log(`\n⚠️  Tied with ${accuracies[1].name} Function`, "yellow");
  }

  log(`\n⚠️  WARNING: Word Count Only is FAST but INACCURATE!`, "yellow");
  log(`   It assumes essays with similar word counts are the same.`, "yellow");
  log(
    `   This causes FALSE POSITIVES when essays have same length but different content.`,
    "yellow",
  );
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  try {
    log("\n╔════════════════════════════════════════════╗", "blue");
    log("║   ESSAY COMPARISON TEST SUITE              ║", "blue");
    log("╚════════════════════════════════════════════╝", "blue");

    runCorrectnessTests();
    runOptimizedFunctionTests();
    runAccuracyComparison();
    runPerformanceComparison();
    runDwdiffBenchmark();
    runPerformanceTests();

    log("\n╔════════════════════════════════════════════╗", "green");
    log("║   ALL TESTS COMPLETED SUCCESSFULLY!        ║", "green");
    log("╚════════════════════════════════════════════╝\n", "green");
  } catch (error) {
    log(`\n✗ Test failed: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
