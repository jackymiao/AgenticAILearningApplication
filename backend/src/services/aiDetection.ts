import { pool } from '../db/index.js';

interface GPTZeroResponse {
  documents: Array<{
    predicted_class: 'ai' | 'human' | 'mixed' | string;
    confidence_score: number;
    confidence_category: string;
    overall_burstiness: number;
    subclass?: {
      ai?: {
        predicted_class: 'pure_ai' | 'ai_paraphrased';
      };
    };
  }>;
}

interface DetectionResult {
  isAI: boolean;
  predicted_class: string;
  confidence_score: number;
  confidence_category: string;
  overall_burstiness: number;
  fullResponse: GPTZeroResponse | null;
}

/**
 * Check if essay content is AI-generated using GPTZero API
 */
export async function detectAIContent(essay: string): Promise<DetectionResult> {
  const apiKey = process.env.GPTZERO_API_KEY;
  
  if (!apiKey) {
    console.error('[DETECTION] ❌ GPTZERO_API_KEY not configured in .env');
    throw new Error('AI detection service not configured');
  }

  const url = 'https://api.gptzero.me/v2/predict/text';
  
  try {
    console.log('[DETECTION] 🔍 Checking essay with GPTZero API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        document: essay,
        multilingual: true,
        modelVersion: '2026-02-14-base',
        apiVersion: '2',
      }),
    });

    if (!response.ok) {
      console.error(`[DETECTION] ❌ GPTZero API error: ${response.status}`, await response.text());
      throw new Error(`GPTZero API returned ${response.status}`);
    }

    const data: any = await response.json();
    
    if (!data.documents || !Array.isArray(data.documents) || data.documents.length === 0) {
      console.error('[DETECTION] ❌ Invalid GPTZero response format:', data);
      throw new Error('Invalid GPTZero response format - no documents array');
    }

    const doc = data.documents[0];
    const predicted_class = doc.predicted_class;
    const confidence_score = doc.confidence_score;
    const confidence_category = doc.confidence_category;
    const overall_burstiness = doc.overall_burstiness;

    const isAI = predicted_class === 'ai' || predicted_class === 'pure_ai';

    console.log(`[DETECTION] Result: predicted_class=${predicted_class}, confidence=${confidence_score}, isAI=${isAI}`);

    return {
      isAI,
      predicted_class,
      confidence_score,
      confidence_category,
      overall_burstiness,
      fullResponse: data,
    };
  } catch (error) {
    console.error('[DETECTION] ❌ Error calling GPTZero API:', error);
    throw error;
  }
}

/**
 * Store AI detection result in database
 */
export async function storeDetectionResult(
  projectCode: string,
  userNameNorm: string,
  essay: string,
  detection: DetectionResult
): Promise<void> {
  try {
    // Store first 500 chars of essay as snippet
    const essaySnippet = essay.substring(0, 500);

    await pool.query(
      `INSERT INTO ai_detections 
       (project_code, user_name_norm, essay_snippet, predicted_class, confidence_score, 
        confidence_category, overall_burstiness, result_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        projectCode,
        userNameNorm,
        essaySnippet,
        detection.predicted_class,
        detection.confidence_score,
        detection.confidence_category,
        detection.overall_burstiness,
        JSON.stringify(detection.fullResponse),
      ]
    );

    console.log(`[DETECTION] ✅ Detection result stored for ${projectCode}/${userNameNorm}`);
  } catch (error) {
    console.error('[DETECTION] ❌ Error storing detection result:', error);
    // Don't throw - logging failure should not break the review flow
  }
}
