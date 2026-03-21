import pool from '../../db/index.js';
import { detectAIContent, storeDetectionResult } from '../aiDetection.js';
import { jest } from '@jest/globals';

describe('AI Detection Service', () => {
  const originalApiKey = process.env.AIORNOT_API_KEY;
  const originalFetch = (global as any).fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.AIORNOT_API_KEY = 'test-bearer-key';
  });

  afterAll(() => {
    process.env.AIORNOT_API_KEY = originalApiKey;
    (global as any).fetch = originalFetch;
  });

  describe('detectAIContent', () => {
    it('throws when AIORNOT_API_KEY is missing', async () => {
      delete process.env.AIORNOT_API_KEY;

      await expect(detectAIContent('sample essay')).rejects.toThrow(
        'AI detection service not configured'
      );
    });

    it('throws when aiornot API returns non-200', async () => {
      (global as any).fetch = (jest.fn() as any).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      });

      await expect(detectAIContent('sample essay')).rejects.toThrow('aiornot API returned 401');
    });

    it('throws when response format is invalid (missing report)', async () => {
      (global as any).fetch = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: '123', metadata: {} }),
      });

      await expect(detectAIContent('sample essay')).rejects.toThrow(
        'Invalid aiornot response format - missing report.ai_text'
      );
    });

    it('detects AI content with high confidence', async () => {
      (global as any).fetch = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: '3c90c3cc-0d44-4b50-8888-8dd25736052a',
          report: {
            ai_text: {
              confidence: 0.95,
              is_detected: true,
              annotations: [
                ['This is AI generated text.', 0.99],
                ['This is human written text.', 0.01],
              ],
            },
          },
          metadata: {
            word_count: 150,
            character_count: 750,
            token_count: 200,
            md5: 'ebe5836f4d7dddc3f9a957eff565be21',
          },
          created_at: '2023-11-07T05:31:56Z',
        }),
      });

      const result = await detectAIContent('sample essay');

      expect(result.isAI).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.wordCount).toBe(150);
      expect(result.characterCount).toBe(750);
      expect(result.tokenCount).toBe(200);
      expect(result.fullResponse?.id).toBe('3c90c3cc-0d44-4b50-8888-8dd25736052a');
    });

    it('detects human content with low AI confidence', async () => {
      (global as any).fetch = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'abc-123',
          report: {
            ai_text: {
              confidence: 0.05,
              is_detected: false,
              annotations: [],
            },
          },
          metadata: {
            word_count: 200,
            character_count: 1000,
            token_count: 250,
            md5: 'abcdef1234567890',
          },
          created_at: '2023-11-07T05:31:56Z',
        }),
      });

      const result = await detectAIContent('sample essay');

      expect(result.isAI).toBe(false);
      expect(result.confidence).toBe(0.05);
      expect(result.wordCount).toBe(200);
    });

    it('sends correct request format to aiornot API', async () => {
      const fetchMock = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test-id',
          report: { ai_text: { confidence: 0.5, is_detected: false, annotations: [] } },
          metadata: { word_count: 100, character_count: 500, token_count: 120, md5: 'test' },
          created_at: new Date().toISOString(),
        }),
      });

      (global as any).fetch = fetchMock;

      await detectAIContent('test essay content');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callArgs = fetchMock.mock.calls[0];
      const url = callArgs[0] as string;
      const options = callArgs[1];

      // Check URL includes endpoint and parameters
      expect(url).toContain('https://api.aiornot.com/v2/text/sync');
      expect(url).toContain('include_annotations=true');

      // Check request headers
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer test-bearer-key');
      expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      // Check body format (URLSearchParams can use + or %20 for spaces)
      expect(options.body).toMatch(/^text=/);
    });
  });

  describe('storeDetectionResult', () => {
    it('stores detection with all metadata fields', async () => {
      const queryMock = jest.spyOn(pool, 'query').mockImplementation(async (sql, params) => {
        if (sql.includes('RETURNING id')) {
          return { rows: [{ id: 'detection-uuid-123' }] } as any;
        }
        return { rows: [] } as any;
      });

      await storeDetectionResult('PROJ01', 'user_norm', 'essay content', {
        isAI: true,
        confidence: 0.92,
        wordCount: 250,
        characterCount: 1500,
        tokenCount: 350,
        fullResponse: {
          id: 'aiornot-id-123',
          report: { ai_text: { confidence: 0.92, is_detected: true, annotations: [] } },
          metadata: { word_count: 250, character_count: 1500, token_count: 350, md5: 'test' },
          created_at: new Date().toISOString(),
        } as any,
      });

      expect(queryMock).toHaveBeenCalled();
      const insertCall = queryMock.mock.calls[0];
      const params = insertCall[1] as any[];

      expect(params[0]).toBe('PROJ01'); // project_code
      expect(params[1]).toBe('user_norm'); // user_name_norm
      expect(params[3]).toBe('ai'); // predicted_class
      expect(params[4]).toBe(0.92); // confidence_score
      expect(params[5]).toBe('HIGH'); // confidence_category (>0.7)
      expect(params[8]).toBe(250); // word_count
      expect(params[9]).toBe(1500); // character_count
      expect(params[10]).toBe(350); // token_count
      expect(params[11]).toBe('aiornot-id-123'); // api_response_id
    });

    it('stores annotations as separate rows', async () => {
      const queryMock = jest.spyOn(pool, 'query').mockImplementation(async (sql, params) => {
        if (sql.includes('RETURNING id')) {
          return { rows: [{ id: 'detection-uuid-456' }] } as any;
        }
        return { rows: [] } as any;
      });

      await storeDetectionResult('PROJ02', 'alice_norm', 'essay text', {
        isAI: true,
        confidence: 0.88,
        wordCount: 300,
        characterCount: 1800,
        tokenCount: 400,
        fullResponse: {
          id: 'aiornot-id-456',
          report: {
            ai_text: {
              confidence: 0.88,
              is_detected: true,
              annotations: [
                ['First suspicious block.', 0.95],
                ['Second suspicious block.', 0.85],
                ['Normal looking text.', 0.1],
              ],
            },
          },
          metadata: {
            word_count: 300,
            character_count: 1800,
            token_count: 400,
            md5: 'abc123',
          },
          created_at: new Date().toISOString(),
        } as any,
      });

      expect(queryMock).toHaveBeenCalledTimes(4); // 1 main insert + 3 annotations

      // Check annotations were inserted
      const annotationCalls = queryMock.mock.calls.slice(1);
      expect(annotationCalls[0][0]).toContain('ai_detections_annotations');
      expect(annotationCalls[0][1][2]).toBe(0.95); // First annotation confidence
      expect(annotationCalls[1][1][2]).toBe(0.85); // Second annotation confidence
      expect(annotationCalls[2][1][2]).toBe(0.1); // Third annotation confidence
    });

    it('calculates confidence_category correctly', async () => {
      jest.spyOn(pool, 'query').mockImplementation(async (sql, params) => {
        if (sql.includes('RETURNING id')) {
          return { rows: [{ id: 'uuid' }] } as any;
        }
        return { rows: [] } as any;
      });

      const baseDetection = {
        wordCount: 100,
        characterCount: 500,
        tokenCount: 120,
        fullResponse: {
          id: 'test',
          report: { ai_text: { confidence: 0.5, is_detected: false, annotations: [] } },
          metadata: { word_count: 100, character_count: 500, token_count: 120, md5: '' },
          created_at: new Date().toISOString(),
        } as any,
      };

      // Test HIGH category (> 0.7)
      await storeDetectionResult('P1', 'user1', 'text', {
        ...baseDetection,
        isAI: true,
        confidence: 0.85,
      });
      let params = (pool.query as any).mock.calls[0][1];
      expect(params[5]).toBe('HIGH');

      // Test MEDIUM category (0.4 - 0.7)
      await storeDetectionResult('P2', 'user2', 'text', {
        ...baseDetection,
        isAI: true,
        confidence: 0.55,
      });
      params = (pool.query as any).mock.calls[1][1];
      expect(params[5]).toBe('MEDIUM');

      // Test LOW category (< 0.4)
      await storeDetectionResult('P3', 'user3', 'text', {
        ...baseDetection,
        isAI: false,
        confidence: 0.2,
      });
      params = (pool.query as any).mock.calls[2][1];
      expect(params[5]).toBe('LOW');
    });

    it('handles missing annotations gracefully', async () => {
      const queryMock = jest.spyOn(pool, 'query').mockImplementation(async (sql) => {
        if (sql.includes('RETURNING id')) {
          return { rows: [{ id: 'uuid' }] } as any;
        }
        return { rows: [] } as any;
      });

      await storeDetectionResult('PROJ', 'user', 'text', {
        isAI: false,
        confidence: 0.1,
        wordCount: 100,
        characterCount: 500,
        tokenCount: 120,
        fullResponse: {
          id: 'test',
          report: { ai_text: { confidence: 0.1, is_detected: false } }, // No annotations
          metadata: { word_count: 100, character_count: 500, token_count: 120, md5: 'test' },
          created_at: new Date().toISOString(),
        } as any,
      });

      // Should only call query once (no annotation inserts)
      expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('swallows database errors without throwing', async () => {
      (jest.spyOn(pool, 'query') as any).mockRejectedValue(new Error('db connection lost'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        storeDetectionResult('PROJ', 'user', 'text', {
          isAI: true,
          confidence: 0.9,
          wordCount: 100,
          characterCount: 500,
          tokenCount: 120,
          fullResponse: {
            id: 'test',
            report: { ai_text: { confidence: 0.9, is_detected: true, annotations: [] } },
            metadata: { word_count: 100, character_count: 500, token_count: 120, md5: 'test' },
            created_at: new Date().toISOString(),
          } as any,
        })
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
