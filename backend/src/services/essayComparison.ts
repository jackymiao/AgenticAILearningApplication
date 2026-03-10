/**
 * Essay comparison service for detecting identical essay submissions
 * Optimized for performance with early rejection based on word count
 */

export interface EssayComparisonResult {
  areEqual: boolean;
  wordCount1: number;
  wordCount2: number;
  wordCountDifference: number;
  differenceIndex: number | null;
  word1?: string;
  word2?: string;
  message: string;
}

/**
 * Extract words from text, removing punctuation and converting to lowercase
 * @param text - The text to extract words from
 * @returns Array of normalized words
 */
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter((word) => word.length > 0); // Remove empty strings
}

/**
 * Compare two essays to determine if they are identical
 * Optimized: First checks if word count difference > 10 for early rejection
 * If word counts are close, performs word-by-word comparison
 * 
 * @param essay1 - First essay to compare
 * @param essay2 - Second essay to compare
 * @returns Comparison result with areEqual flag and metadata
 */
export function compareEssaysOptimized(essay1: string, essay2: string): EssayComparisonResult {
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
    differenceIndex: null,
    message: 'Essays are identical',
  };
}
