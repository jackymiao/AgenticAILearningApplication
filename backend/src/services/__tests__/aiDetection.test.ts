import pool from '../../db/index.js';
import { detectAIContent, storeDetectionResult } from '../aiDetection.js';
import { jest } from '@jest/globals';

describe('AI Detection Service', () => {
  const originalApiKey = process.env.GPTZERO_API_KEY;
  const originalFetch = (global as any).fetch;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.GPTZERO_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env.GPTZERO_API_KEY = originalApiKey;
    (global as any).fetch = originalFetch;
  });

  it('throws when GPTZERO_API_KEY is missing', async () => {
    delete process.env.GPTZERO_API_KEY;

    await expect(detectAIContent('sample essay')).rejects.toThrow(
      'AI detection service not configured'
    );
  });

  it('throws when GPTZero API returns non-200', async () => {
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    });

    await expect(detectAIContent('sample essay')).rejects.toThrow('GPTZero API returned 500');
  });

  it('throws when response format has no documents', async () => {
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      json: async () => ({ foo: 'bar' }),
    });

    await expect(detectAIContent('sample essay')).rejects.toThrow(
      'Invalid GPTZero response format - no documents array'
    );
  });

  it('maps ai class to isAI=true', async () => {
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [
          {
            predicted_class: 'ai',
            confidence_score: 0.92,
            confidence_category: 'high',
            overall_burstiness: 0.12,
          },
        ],
      }),
    });

    const result = await detectAIContent('sample essay');

    expect(result.isAI).toBe(true);
    expect(result.predicted_class).toBe('ai');
    expect(result.confidence_score).toBe(0.92);
  });

  it('maps human class to isAI=false', async () => {
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [
          {
            predicted_class: 'human',
            confidence_score: 0.81,
            confidence_category: 'high',
            overall_burstiness: 0.45,
          },
        ],
      }),
    });

    const result = await detectAIContent('sample essay');

    expect(result.isAI).toBe(false);
    expect(result.predicted_class).toBe('human');
  });

  it('storeDetectionResult inserts expected values', async () => {
    const querySpy = jest
      .spyOn(pool, 'query')
      .mockImplementation(async () => ({ rows: [] } as any));

    await storeDetectionResult(
      'TEST01',
      'alice',
      'a'.repeat(700),
      {
        isAI: false,
        predicted_class: 'human',
        confidence_score: 0.8,
        confidence_category: 'high',
        overall_burstiness: 0.33,
        fullResponse: { documents: [] } as any,
      }
    );

    expect(querySpy).toHaveBeenCalledTimes(1);
    const args = querySpy.mock.calls[0][1] as any[];
    expect(args[0]).toBe('TEST01');
    expect(args[1]).toBe('alice');
    expect((args[2] as string).length).toBe(500);
  });

  it('storeDetectionResult swallows database errors', async () => {
    jest
      .spyOn(pool, 'query')
      .mockImplementation(async () => Promise.reject(new Error('db down')));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      storeDetectionResult(
        'TEST01',
        'alice',
        'essay text',
        {
          isAI: true,
          predicted_class: 'ai',
          confidence_score: 0.99,
          confidence_category: 'high',
          overall_burstiness: 0.02,
          fullResponse: { documents: [] } as any,
        }
      )
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });
});
