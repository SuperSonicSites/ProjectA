import { buildSEOSystemPrompt } from './prompt';
import { callGeminiVision } from './gemini-vision';
import { SEOReviewInput, SEOReviewOutput, SEOValidationError } from './types';

async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Failed to fetch image (${resp.status}): ${body || resp.statusText}`);
  }

  const contentType = resp.headers.get('content-type') || '';
  const arrayBuffer = await resp.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Best-effort mime type inference
  let mimeType = 'image/png';
  if (contentType.startsWith('image/')) {
    mimeType = contentType.split(';')[0];
  } else if (imageUrl.toLowerCase().endsWith('.jpg') || imageUrl.toLowerCase().endsWith('.jpeg')) {
    mimeType = 'image/jpeg';
  } else if (imageUrl.toLowerCase().endsWith('.webp')) {
    mimeType = 'image/webp';
  }

  return { base64, mimeType };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }

  // Strip common code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    const candidate = fenceMatch[1].trim();
    if (candidate.startsWith('{')) return JSON.parse(candidate);
  }

  // Fallback: try to locate first {...} block
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    return JSON.parse(candidate);
  }

  throw new Error('Model did not return JSON.');
}

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function truncateAtWordBoundary(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > Math.floor(max * 0.6)) return slice.slice(0, lastSpace).trim();
  return slice.trim();
}

/**
 * Truncate to sentence boundary, preferring complete sentences
 */
function truncateToSentence(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  
  // Try to find last complete sentence before maxLen
  const beforeMax = t.slice(0, maxLen);
  const sentenceEndings = ['. ', '! ', '? '];
  let lastSentenceEnd = -1;
  
  for (const ending of sentenceEndings) {
    const pos = beforeMax.lastIndexOf(ending);
    if (pos > lastSentenceEnd) lastSentenceEnd = pos;
  }
  
  // If we found a sentence end and it's not too short (>60% of max), use it
  if (lastSentenceEnd > Math.floor(maxLen * 0.6)) {
    return t.slice(0, lastSentenceEnd + 1).trim();
  }
  
  // Otherwise fall back to word boundary
  return truncateAtWordBoundary(t, maxLen);
}

function validateOutput(o: SEOReviewOutput): void {
  const errors: Record<string, unknown> = {};

  if (!o.title || o.title.length > 50) errors.title = { length: o.title?.length, max: 50 };
  if (!o.description || o.description.length < 140 || o.description.length > 160) {
    errors.description = { length: o.description?.length, min: 140, max: 160 };
  }
  if (!o.pinterest_title || o.pinterest_title.length > 80) {
    errors.pinterest_title = { length: o.pinterest_title?.length, max: 80 };
  }
  if (!o.pinterest_description || o.pinterest_description.length < 200 || o.pinterest_description.length > 300) {
    errors.pinterest_description = { length: o.pinterest_description?.length, min: 200, max: 300 };
  }
  if (!o.prompt) errors.prompt = { value: o.prompt };

  if (Object.keys(errors).length > 0) {
    throw new SEOValidationError('SEO output validation failed', errors);
  }
}

function coerceOutput(raw: any): SEOReviewOutput {
  return {
    title: normalizeString(raw?.title),
    description: normalizeString(raw?.description),
    pinterest_title: normalizeString(raw?.pinterest_title),
    pinterest_description: normalizeString(raw?.pinterest_description),
    prompt: normalizeString(raw?.prompt)
  };
}

function keepFirstTwoSentences(s: string): string {
  const t = s.trim();
  if (!t) return t;
  const parts = t.split(/(?<=[.!?])\s+/);
  if (parts.length <= 2) return t;
  return `${parts[0]} ${parts[1]}`.trim();
}

function autoFixOutput(o: SEOReviewOutput, subject: string): SEOReviewOutput {
  // Titles - remove trailing connectors if truncated
  o.title = truncateAtWordBoundary(o.title, 50).replace(/\s+(And|With|Or|In|On|Of)$/i, '');
  o.pinterest_title = truncateAtWordBoundary(o.pinterest_title, 80).replace(/\s+(And|With|Or|In|On|Of)$/i, '');

  // Description (140-160) - use sentence-aware truncation
  if (o.description.length > 160) {
    o.description = truncateToSentence(o.description, 160);
  }

  // Pinterest description (200-300) - use sentence-aware truncation
  if (o.pinterest_description.length > 300) {
    o.pinterest_description = truncateToSentence(o.pinterest_description, 300);
  }
  if (o.pinterest_description.length < 200) {
    // Only pad if doesn't already have CTA
    const hasCTA = /download|print|get/i.test(o.pinterest_description);
    const suffixes = hasCTA
      ? [' Perfect for relaxation and creativity!']
      : [' Download this free printable today!'];
    
    for (const sfx of suffixes) {
      if (o.pinterest_description.length >= 200) break;
      o.pinterest_description = (o.pinterest_description + sfx).replace(/\s+/g, ' ').trim();
      if (o.pinterest_description.length > 300) {
        o.pinterest_description = truncateToSentence(o.pinterest_description, 300);
      }
    }
  }

  // Alt text: keep 1-2 sentences
  o.prompt = keepFirstTwoSentences(o.prompt);
  return o;
}

export async function reviewSEO(input: SEOReviewInput): Promise<SEOReviewOutput> {
  const systemPrompt = buildSEOSystemPrompt(input);
  const { base64: imageBase64, mimeType } = await fetchImageAsBase64(input.imageUrl);

  const attempt = async (extraInstruction?: string) => {
    const prompt = extraInstruction
      ? `${systemPrompt}\n\nIMPORTANT: ${extraInstruction}`
      : systemPrompt;

    const rawText = await callGeminiVision({
      model: 'gemini-2.5-flash',
      systemPrompt: prompt,
      imageBase64,
      mimeType
    });

    const rawJson = extractJsonObject(rawText);
    const output = autoFixOutput(coerceOutput(rawJson), input.subject);
    validateOutput(output);
    return output;
  };

  // v1: retry once on parse/validation failure
  try {
    return await attempt();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return await attempt(`Your previous response was invalid (${msg}). Return ONLY valid JSON matching the required fields and character limits.`);
  }
}

export * from './types';


