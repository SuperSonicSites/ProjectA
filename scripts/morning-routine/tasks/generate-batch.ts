import fs from 'fs-extra';
import path from 'path';
import { generateImage } from '../lib/gemini';
import { uploadImage } from '../lib/storage';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';
import { loadPrompt, getRandomVariant, buildPromptWithStyle, StyleSelectionOptions } from '../lib/prompt-manager';
import { readIndexFile } from '../lib/hugo-manager';
import { ENV } from '../config/env';

export interface GenerationResult {
  id: string;
  status: 'success' | 'failed';
  path?: string;
  error?: string;
  duration?: number;
  retries?: number;
}

/**
 * Generate a clean, short title for the page (H1)
 * Removes parenthetical content and capitalizes each word properly
 * Example: "Curious Scottish Fold Cat Peering Into A Fishbowl"
 */
function generateTitle(variantPrompt: string): string {
  // Remove content in parentheses (with proper spacing)
  let cleanPrompt = variantPrompt.replace(/\s*\([^)]*\)\s*/g, ' ');
  
  // Remove extra punctuation and trim
  cleanPrompt = cleanPrompt.replace(/\.\s*$/, '').trim();
  
  // Normalize multiple spaces to single space
  cleanPrompt = cleanPrompt.replace(/\s+/g, ' ');
  
  // Capitalize each word (Title Case)
  const words = cleanPrompt.split(' ');
  const capitalizedWords = words.map(word => {
    if (word.length === 0) return word;
    // Handle words with special characters (e.g., "Red Admiral")
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return capitalizedWords.join(' ');
}

/**
 * Generate SEO-optimized meta description (150-160 characters)
 * Used for meta tags, OpenGraph, search engine snippets
 */
function generateSEODescription(variantPrompt: string, styleName: string): string {
  // Remove parenthetical content for cleaner description
  const cleanPrompt = variantPrompt.replace(/\s*\([^)]*\)\s*/g, '').replace(/\.\s*$/, '').trim().toLowerCase();

  const base = `Free printable ${cleanPrompt} coloring page in ${styleName.toLowerCase()} style.`;
  const features = `Perfect for all ages.`;
  const cta = `Download and print for free!`;

  const fullDesc = `${base} ${features} ${cta}`;

  // Ensure 150-160 chars with smart truncation
  if (fullDesc.length > 160) {
    // Try to find the last complete sentence
    const lastPeriod = fullDesc.substring(0, 160).lastIndexOf('.');
    if (lastPeriod > 100) { // Don't truncate too early
      return fullDesc.substring(0, lastPeriod + 1);
    }
    // Fallback: find last space to avoid cutting words
    const lastSpace = fullDesc.substring(0, 157).lastIndexOf(' ');
    return fullDesc.substring(0, lastSpace) + '...';
  }
  return fullDesc;
}

/**
 * Generate Pinterest-optimized description (200-250 characters)
 * Used in RSS feed for Pinterest auto-publish
 * Ensures complete sentences and strong CTA
 */
function generatePinterestDescription(
  variantPrompt: string,
  styleName: string,
  medium: string
): string {
  // Remove parenthetical content for cleaner description
  const cleanPrompt = variantPrompt.replace(/\s*\([^)]*\)\s*/g, '').replace(/\.\s*$/, '').trim().toLowerCase();

  const intro = `Free printable ${cleanPrompt} coloring page in ${styleName.toLowerCase()} style.`;
  const details = `Easy-to-color lines perfect for ${medium.toLowerCase()}.`;
  const audience = `Great for kids, adults, and all skill levels.`;
  const cta = `Download for free now!`;

  let fullDesc = `${intro} ${details} ${audience} ${cta}`;

  // If still over 250, intelligently trim to complete sentences
  if (fullDesc.length > 250) {
    // Try without audience
    fullDesc = `${intro} ${details} ${cta}`;

    // If still too long, shorten the intro
    if (fullDesc.length > 250) {
      const shortIntro = intro.length > 100 ? intro.substring(0, 97) + '...' : intro;
      fullDesc = `${shortIntro} ${details} ${cta}`;
    }
  }

  // Final safety check - ensure ends with complete sentence
  if (fullDesc.length > 250) {
    const lastPeriod = fullDesc.substring(0, 250).lastIndexOf('.');
    if (lastPeriod > 150) { // Only truncate at period if it's not too short
      fullDesc = fullDesc.substring(0, lastPeriod + 1);
    } else {
      fullDesc = fullDesc.substring(0, 247) + '...';
    }
  }

  return fullDesc;
}

/**
 * Generate SEO-friendly slug from style and collection
 * Format: {style}-{collection}-coloring-pages-{uuid}
 * Example: "totem-butterflies-coloring-pages-7292"
 */
/**
 * Generate a batch of coloring pages for a specific collection
 * Uses rate limiting to respect API quotas
 * Style selection can be controlled via environment variables:
 * - STYLE_MODE: 'random' (default) or 'rotate'
 * - STYLE_ROTATION_KEY: Date key for rotation (YYYY-MM-DD format)
 * - STYLE_NAME: Manual style override
 */
export const generateBatch = async (
  category: string,
  collection: string,
  count?: number
) => {
  // Deterministic run id for downstream batch SEO step (GitHub Actions sets GENERATION_RUN_ID)
  const runId =
    process.env.GENERATION_RUN_ID ||
    new Date().toISOString().replace(/[:.]/g, '-'); // safe for filenames on all OSes

  // Load collection metadata and prompt
  const contentDir = path.join(path.resolve(__dirname, '../../../content'), category, collection);
  if (!fs.existsSync(contentDir)) {
    throw new Error(`Collection not found: ${category}/${collection}`);
  }

  const indexPath = path.join(contentDir, '_index.md');
  const collectionMeta = readIndexFile(indexPath);
  const batchSize = count || collectionMeta.cms_batch_size || 5;

  const promptConfig = loadPrompt(category, collection);
  if (!promptConfig) {
    throw new Error(`Prompt not found for collection: ${category}/${collection}`);
  }

  // Read style selection options from environment
  const styleMode = (process.env.STYLE_MODE as 'random' | 'rotate') || 'random';
  const styleRotationKey = process.env.STYLE_ROTATION_KEY || new Date().toISOString().slice(0, 10);
  const styleName = process.env.STYLE_NAME;

  const styleOptions: StyleSelectionOptions = {
    mode: styleMode,
    rotationKey: styleMode === 'rotate' ? styleRotationKey : undefined,
    styleName: styleName
  };

  logger.info(`Starting batch generation for ${batchSize} images in ${category}/${collection}`, {
    styleMode,
    rotationKey: styleMode === 'rotate' ? styleRotationKey : 'N/A',
    styleName: styleName || 'N/A'
  });

  const results: GenerationResult[] = [];
  const createdMdPaths: string[] = []; // repo-relative, for manifest
  const limiter = new RateLimiter(2, 5000); // 2 concurrent, 5 seconds between API calls
  const collectionPrefix = collection.slice(0, 3); // "cat", "dog", etc.

  for (let i = 0; i < batchSize; i++) {
    await limiter.throttle(async () => {
      const startTime = Date.now();
      const timestamp = Date.now();
      const variantPrompt = getRandomVariant(category, collection);

      // Build prompt with style (mode and options controlled by env vars or defaults)
      const { fullPrompt, style, negative_prompt } = buildPromptWithStyle(
        category,
        collection,
        variantPrompt,
        styleOptions
      );

      // 1. Generate unique temporary filename
      const tempId = `temp-${timestamp}`;

      try {
        logger.info(`[${i + 1}/${batchSize}] Generating`, {
          tempId,
          variant: variantPrompt.substring(0, 40),
          style: style.name
        });

        // 1. Generate image with negative prompt passed separately
        const imageBuffer = await generateImage(fullPrompt, negative_prompt);

        // 2. Upload to R2 and CF Images
        const filename = `${tempId}.png`;
        const uploadResult = await uploadImage(imageBuffer, filename, collection);

        // 3. Create Draft Markdown with full metadata
        const template = collectionMeta.cms_frontmatter_template || {
          type: 'coloring-pages',
          style: style.name,
          medium: 'Markers'
        };

        // Determine audience from style
        const audience = style.targetAudience;

        // Determine medium (Priority: PromptConfig > Style > Collection Meta > Default)
        const medium = promptConfig.medium || style.preferredMedium || template.medium || 'Markers';

        // Generate SEO-optimized content
        const title = generateTitle(variantPrompt);
        const seoDescription = generateSEODescription(variantPrompt, style.name);
        const pinterestDescription = generatePinterestDescription(
          variantPrompt,
          style.name,
          medium
        );

        const mdContent = `---
title: "${title}"
description: "${seoDescription}"
pinterest_description: "${pinterestDescription}"
date: ${new Date().toISOString()}
type: "${template.type || 'coloring-pages'}"
draft: false
categories:
  - ${category}
style: "${style.name}"
medium: "${medium}"
audience: "${audience}"
cf_image_id: "${uploadResult.cfImageId}"
image_url: "${uploadResult.imageUrl}"
download_url: "${uploadResult.downloadUrl}"
r2_original: "${uploadResult.r2Url}"
prompt: "${variantPrompt}"
---

A beautiful ${collection} coloring page in ${style.name} style.

**Style:** ${style.name}
**Medium:** ${medium}, crayons, or colored pencils

---

![Coloring Page](${uploadResult.imageUrl})
`;

        const mdPath = path.join(contentDir, `${tempId}.md`);
        await fs.writeFile(mdPath, mdContent);

        // Record created file for manifest (repo-relative path)
        const repoRel = path
          .relative(path.resolve(__dirname, '../../../'), mdPath)
          .replace(/\\/g, '/');
        createdMdPaths.push(repoRel);

        const duration = Date.now() - startTime;
        logger.success(`[${i + 1}/${batchSize}] Complete`, {
          tempId,
          path: mdPath,
          duration: `${duration}ms`
        });

        results.push({
          id: tempId,
          status: 'success',
          path: mdPath,
          duration
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);

        logger.error(`[${i + 1}/${batchSize}] Generation failed`, error as Error);

        results.push({
          id: tempId,
          status: 'failed',
          error: errorMsg,
          duration
        });
      }
    });
  }

  logger.info('Batch generation complete', {
    collection: `${category}/${collection}`,
    total: batchSize,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length
  });

  // Write manifest for downstream SEO batch step
  try {
    const runsDir = path.resolve(__dirname, '../.runs'); // scripts/morning-routine/.runs
    await fs.ensureDir(runsDir);
    const manifestPath = path.join(runsDir, `${runId}.json`);
    const manifest = {
      runId,
      created: createdMdPaths
    };
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    logger.success('Wrote generation manifest', { runId, manifestPath, created: createdMdPaths.length });
  } catch (e) {
    logger.warn('Failed to write generation manifest (continuing)', {
      error: e instanceof Error ? e.message : String(e)
    });
  }

  return results;
};

// Allow direct execution
if (require.main === module) {
  const category = process.argv[2] || 'animals';
  const collection = process.argv[3] || 'cats';
  const count = process.argv[4] ? parseInt(process.argv[4]) : undefined;

  generateBatch(category, collection, count)
    .then(results => {
      logger.success('Batch operation finished');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      logger.error('Batch operation failed', error);
      process.exit(1);
    });
}
