/**
 * Compare two essays word by word
 * Ignores spacing and punctuation, only compares actual words
 */
export function compareEssays(essay1, essay2) {
  // Extract words from text, removing punctuation and converting to lowercase
  const extractWords = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter((word) => word.length > 0); // Remove empty strings
  };

  const words1 = extractWords(essay1);
  const words2 = extractWords(essay2);

  // Check if word count matches
  if (words1.length !== words2.length) {
    return {
      areEqual: false,
      wordCount1: words1.length,
      wordCount2: words2.length,
      differenceIndex: null,
      message: `Word count mismatch: ${words1.length} vs ${words2.length}`,
    };
  }

  // Compare word by word
  for (let i = 0; i < words1.length; i++) {
    if (words1[i] !== words2[i]) {
      return {
        areEqual: false,
        wordCount1: words1.length,
        wordCount2: words2.length,
        differenceIndex: i,
        word1: words1[i],
        word2: words2[i],
        message: `Difference at word ${i + 1}: "${words1[i]}" vs "${words2[i]}"`,
      };
    }
  }

  return {
    areEqual: true,
    wordCount1: words1.length,
    wordCount2: words2.length,
    message: "Essays are identical",
  };
}

/**
 * Optimized comparison: First checks if word count difference > 10
 * If difference is greater than 10, returns false immediately
 * Otherwise, compares word by word
 */
export function compareEssaysOptimized(essay1, essay2) {
  // Extract words from text, removing punctuation and converting to lowercase
  const extractWords = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter((word) => word.length > 0); // Remove empty strings
  };

  const words1 = extractWords(essay1);
  const words2 = extractWords(essay2);

  // OPTIMIZATION: Check if word count difference is greater than 10
  const wordCountDiff = Math.abs(words1.length - words2.length);
  if (wordCountDiff > 10) {
    return {
      areEqual: false,
      wordCount1: words1.length,
      wordCount2: words2.length,
      wordCountDifference: wordCountDiff,
      differenceIndex: null,
      message: `Word count difference too large (${wordCountDiff} words). Quick rejection.`,
    };
  }

  // If word counts are different but within 10 words, still return false
  // (they can't be the same if they have different lengths)
  if (words1.length !== words2.length) {
    return {
      areEqual: false,
      wordCount1: words1.length,
      wordCount2: words2.length,
      wordCountDifference: wordCountDiff,
      differenceIndex: null,
      message: `Word count mismatch: ${words1.length} vs ${words2.length}`,
    };
  }

  // Compare word by word (only if word counts match exactly)
  for (let i = 0; i < words1.length; i++) {
    if (words1[i] !== words2[i]) {
      return {
        areEqual: false,
        wordCount1: words1.length,
        wordCount2: words2.length,
        wordCountDifference: 0,
        differenceIndex: i,
        word1: words1[i],
        word2: words2[i],
        message: `Difference at word ${i + 1}: "${words1[i]}" vs "${words2[i]}"`,
      };
    }
  }

  return {
    areEqual: true,
    wordCount1: words1.length,
    wordCount2: words2.length,
    wordCountDifference: 0,
    message: "Essays are identical",
  };
}

/**
 * Word count only comparison: FAST but potentially INACCURATE
 * If word count difference > 10: returns true (not same)
 * If word count difference <= 10: returns false (same)
 * WARNING: This assumes essays with similar word counts are the same!
 */
export function compareWordCountOnly(essay1, essay2) {
  // Extract words from text, removing punctuation and converting to lowercase
  const extractWords = (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/) // Split by whitespace
      .filter((word) => word.length > 0); // Remove empty strings
  };

  const words1 = extractWords(essay1);
  const words2 = extractWords(essay2);

  const wordCountDiff = Math.abs(words1.length - words2.length);

  // If difference > 10, return true (not same)
  if (wordCountDiff > 10) {
    return {
      areEqual: false,
      method: "word-count-only",
      wordCount1: words1.length,
      wordCount2: words2.length,
      wordCountDifference: wordCountDiff,
      message: `Word count difference > 10 (${wordCountDiff}). Assuming NOT same.`,
    };
  }

  // If difference <= 10, return false (same)
  // WARNING: This is an assumption! Essays could have same length but different content
  return {
    areEqual: true,
    method: "word-count-only",
    wordCount1: words1.length,
    wordCount2: words2.length,
    wordCountDifference: wordCountDiff,
    message: `Word count difference <= 10 (${wordCountDiff}). Assuming SAME.`,
  };
}

/**
 * Generate a test essay with specified word count
 */
export function generateEssay(wordCount) {
  const words = [
    "the",
    "quick",
    "brown",
    "fox",
    "jumps",
    "over",
    "lazy",
    "dog",
    "computer",
    "science",
    "education",
    "learning",
    "technology",
    "students",
    "knowledge",
    "skills",
    "development",
    "programming",
    "software",
    "system",
    "process",
    "method",
    "approach",
    "solution",
    "problem",
    "analysis",
    "research",
    "study",
    "practice",
    "theory",
    "application",
    "implementation",
  ];

  const essay = [];
  for (let i = 0; i < wordCount; i++) {
    essay.push(words[i % words.length]);
  }

  return essay.join(" ") + ".";
}
