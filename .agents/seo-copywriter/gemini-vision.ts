import { GoogleGenerativeAI } from '@google/generative-ai';
import { ENV } from '../../scripts/morning-routine/config/env';
import { logger } from '../../scripts/morning-routine/lib/logger';

export interface VisionCallOptions {
  model: string;
  systemPrompt: string;
  imageBase64: string;
  mimeType: string;
}

export async function callGeminiVision(opts: VisionCallOptions): Promise<string> {
  const apiKey = ENV.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Set it in .dev.vars or environment variables.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: opts.model });

  const result = await model.generateContent([
    opts.systemPrompt,
    {
      inlineData: {
        data: opts.imageBase64,
        mimeType: opts.mimeType
      }
    }
  ]);

  // The SDK returns text; we enforce JSON-only via parsing/validation upstream.
  const text = result.response.text();
  logger.debug('SEO Copywriter raw model response', { length: text.length });
  return text;
}


