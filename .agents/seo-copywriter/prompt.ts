import fs from 'fs';
import path from 'path';
import { SEOReviewInput } from './types';

function readSpec(): string {
  const specPath = path.resolve(__dirname, 'spec.md');
  return fs.readFileSync(specPath, 'utf8');
}

function replaceAllCompat(haystack: string, needle: string, replacement: string): string {
  return haystack.split(needle).join(replacement);
}

export function buildSEOSystemPrompt(input: SEOReviewInput): string {
  const spec = readSpec();
  return replaceAllCompat(
    replaceAllCompat(
      replaceAllCompat(
        replaceAllCompat(spec, '{{subject}}', input.subject),
        '{{style}}',
        input.style
      ),
      '{{medium}}',
      input.medium
    ),
    '{{originalPrompt}}',
    input.originalPrompt || 'Not provided'
  );
}


