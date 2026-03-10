import { compareEssaysOptimized } from '../essayComparison.js';

describe('Essay Comparison Service', () => {
  describe('compareEssaysOptimized', () => {
    it('should return areEqual: true for identical essays', () => {
      const essay1 = 'This is a test essay with some words.';
      const essay2 = 'This is a test essay with some words.';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(true);
      expect(result.wordCount1).toBe(result.wordCount2);
      expect(result.wordCountDifference).toBe(0);
    });

    it('should return areEqual: true for essays with different punctuation but same words', () => {
      const essay1 = 'This is a test! Essay with some words.';
      const essay2 = 'This is a test Essay with some words';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(true);
    });

    it('should return areEqual: true for essays with different case but same words', () => {
      const essay1 = 'This Is A Test Essay With Some Words';
      const essay2 = 'this is a test essay with some words';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(true);
    });

    it('should return areEqual: false for different essays with same word count', () => {
      const essay1 = 'This is the first essay version.';
      const essay2 = 'This is the second essay version.';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(false);
      expect(result.wordCount1).toBe(result.wordCount2);
      expect(result.differenceIndex).not.toBeNull();
    });

    it('should return areEqual: false for essays with word count difference > 10', () => {
      const essay1 = 'Short essay.';
      const essay2 = 'This is a much longer essay with many more words to exceed the threshold of ten words difference.';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(false);
      expect(result.wordCountDifference).toBeGreaterThan(10);
    });

    it('should return areEqual: false for essays with word count difference <= 10', () => {
      const essay1 = 'This is a short essay.';
      const essay2 = 'This is a short essay with a few extra words.';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(false);
      expect(result.wordCountDifference).toBeLessThanOrEqual(10);
    });

    it('should handle empty strings', () => {
      const essay1 = '';
      const essay2 = '';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(true);
      expect(result.wordCount1).toBe(0);
      expect(result.wordCount2).toBe(0);
    });

    it('should handle essays with only whitespace and punctuation', () => {
      const essay1 = '   !!!  ???   ';
      const essay2 = ' . , ; : ';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(true);
      expect(result.wordCount1).toBe(0);
      expect(result.wordCount2).toBe(0);
    });

    it('should detect difference when one word is added', () => {
      const essay1 = 'This is my original essay.';
      const essay2 = 'This is my original revised essay.';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(false);
    });

    it('should detect difference when word order changes', () => {
      const essay1 = 'The quick brown fox jumps over the lazy dog.';
      const essay2 = 'The brown quick fox jumps over the lazy dog.';
      
      const result = compareEssaysOptimized(essay1, essay2);
      
      expect(result.areEqual).toBe(false);
      expect(result.differenceIndex).toBe(1); // Second word differs
    });
  });
});
