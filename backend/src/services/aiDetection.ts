import { URLSearchParams } from 'url';
import { pool } from '../db/index.js';

interface AiornotResponse {
  id: string;
  report: {
    ai_text: {
      confidence: number;
      is_detected: boolean;
      annotations?: Array<[string, number]>;
    };
  };
  metadata: {
    word_count: number;
    character_count: number;
    token_count: number;
    md5: string;
  };
  created_at: string;
  external_id?: string;
}

interface DetectionResult {
  isAI: boolean;
  confidence: number;
  wordCount: number;
  characterCount: number;
  tokenCount: number;
  fullResponse: AiornotResponse | null;
}

/**
 * Check if essay content is AI-generated using aiornot API
 */
export async function detectAIContent(essay: string): Promise<DetectionResult> {
  const apiKey = process.env.AIORNOT_API_KEY;
  
  if (!apiKey) {
    console.error('[DETECTION] ❌ AIORNOT_API_KEY not configured in .env');
    throw new Error('AI detection service not configured');
  }

  const url = 'https://api.aiornot.com/v2/text/sync';
  
  try {
    console.log('[DETECTION] 🔍 Checking essay with aiornot API...');
    
    const params = new URLSearchParams({
      include_annotations: 'true',
    });

    // Create form-urlencoded body
    const body = new URLSearchParams({
      text: essay,
    }).toString();

    const response = await fetch(`${url}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    if (!response.ok) {
      console.error(`[DETECTION] ❌ aiornot API error: ${response.status}`, await response.text());
      throw new Error(`aiornot API returned ${response.status}`);
    }

    const data: AiornotResponse = await response.json() as AiornotResponse;
    
    if (!data.report || !data.report.ai_text) {
      console.error('[DETECTION] ❌ Invalid aiornot response format:', data);
      throw new Error('Invalid aiornot response format - missing report.ai_text');
    }

    const aiText = data.report.ai_text;
    const isAI = aiText.is_detected;
    const confidence = aiText.confidence;
    const wordCount = data.metadata.word_count;
    const characterCount = data.metadata.character_count;
    const tokenCount = data.metadata.token_count;

    console.log(`[DETECTION] Result: isAI=${isAI}, confidence=${confidence}, wordCount=${wordCount}`);

    return {
      isAI,
      confidence,
      wordCount,
      characterCount,
      tokenCount,
      fullResponse: data,
    };
  } catch (error) {
    console.error('[DETECTION] ❌ Error calling aiornot API:', error);
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
    const confidenceCategory = detection.confidence > 0.7 ? 'HIGH' : detection.confidence > 0.4 ? 'MEDIUM' : 'LOW';
    const apiResponseId = detection.fullResponse?.id || null;

    // Insert detection record and get the ID
    const detectionResult = await pool.query<{ id: string }>(
      `INSERT INTO ai_detections 
       (project_code, user_name_norm, essay_snippet, predicted_class, confidence_score, 
        confidence_category, overall_burstiness, is_detected, word_count, character_count, 
        token_count, api_response_id, result_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        projectCode,
        userNameNorm,
        essaySnippet,
        detection.isAI ? 'ai' : 'human',
        detection.confidence,
        confidenceCategory,
        0, // No direct burstiness from aiornot, set to 0
        detection.isAI,
        detection.wordCount,
        detection.characterCount,
        detection.tokenCount,
        apiResponseId,
        JSON.stringify(detection.fullResponse),
      ]
    );

    const detectionId = detectionResult.rows[0].id;

    // Store annotations if available
    if (detection.fullResponse?.report?.ai_text?.annotations && 
        Array.isArray(detection.fullResponse.report.ai_text.annotations) &&
        detection.fullResponse.report.ai_text.annotations.length > 0) {
      
      const annotations = detection.fullResponse.report.ai_text.annotations;
      
      for (const [blockText, confidence] of annotations) {
        await pool.query(
          `INSERT INTO ai_detections_annotations 
           (detection_id, block_text, confidence)
           VALUES ($1, $2, $3)`,
          [detectionId, blockText, confidence]
        );
      }
      
      console.log(`[DETECTION] ✅ Stored ${annotations.length} annotations for detection ${detectionId}`);
    }

    console.log(`[DETECTION] ✅ Detection result stored for ${projectCode}/${userNameNorm}`);
  } catch (error) {
    console.error('[DETECTION] ❌ Error storing detection result:', error);
    // Don't throw - logging failure should not break the review flow
  }
}
