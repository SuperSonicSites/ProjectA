import fs from 'fs-extra';
import path from 'path';
import { generateImage } from '../lib/gemini';
import { uploadImage } from '../lib/storage';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';
import { loadPrompt, getRandomVariant } from '../lib/prompt-manager';
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
 * Removes "Cat Coloring Page:" prefix and parenthetical content
 * Example: "Curious Scottish Fold Cat peering into a fishbowl"
 */
function generateTitle(variantPrompt: string): string {
  // Remove content in parentheses and extra punctuation
  let cleanPrompt = variantPrompt.replace(/\s*\([^)]*\)\s*/g, '').replace(/\.\s*$/, '').trim();

  return cleanPrompt;
}

/**
 * Generate SEO-optimized meta description (150-160 characters)
 * Used for meta tags, OpenGraph, search engine snippets
 */
function generateSEODescription(variantPrompt: string, difficulty: string, style: string): string {
  // Remove parenthetical content for cleaner description
  const cleanPrompt = variantPrompt.replace(/\s*\([^)]*\)\s*/g, '').replace(/\.\s*$/, '').trim().toLowerCase();

  const base = `Free printable ${cleanPrompt} coloring page.`;
  const features = `${difficulty} difficulty with ${style.toLowerCase()} lines.`;
  const cta = `Perfect for kids and adults. Download and print for free!`;

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
  difficulty: string,
  style: string,
  medium: string
): string {
  // Remove parenthetical content for cleaner description
  const cleanPrompt = variantPrompt.replace(/\s*\([^)]*\)\s*/g, '').replace(/\.\s*$/, '').trim().toLowerCase();

  const intro = `Free printable ${cleanPrompt} coloring page.`;
  const details = `Features ${style.toLowerCase()}, easy-to-color lines perfect for ${medium.toLowerCase()}.`;
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
 * Generate SEO-friendly slug from variant prompt
 * Format: {tag}-{collection}-coloring-page-{uuid}
 * Example: "sleepy-cat-coloring-page-7292"
 */
function generateSlugFromPrompt(variantPrompt: string, collection: string, timestamp: number): string {
  // Extract the first word (tone/style) from the variant prompt
  // Example: "Sleepy Siamese Cat napping..." -> "Sleepy"
  const tag = variantPrompt.trim().split(/\s+/)[0].toLowerCase();

  // Get singular collection name in lowercase
  // "cats" -> "cat", "Dogs" -> "dog"
  const singularCollection = collection.endsWith('s')
    ? collection.slice(0, -1).toLowerCase()
    : collection.toLowerCase();

  // Get last 4 digits of timestamp for uniqueness (short UUID)
  const uuid = String(timestamp).slice(-4);

  // Construct slug: {tag}-{collection}-coloring-page-{uuid}
  const slug = `${tag}-${singularCollection}-coloring-page-${uuid}`;

  return slug;
}

/**
 * Generate a batch of coloring pages for a specific collection
 * Uses rate limiting to respect API quotas
 */
export const generateBatch = async (
  category: string,
  collection: string,
  count?: number
) => {
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

  logger.info(`Starting batch generation for ${batchSize} images in ${category}/${collection}`);

  const results: GenerationResult[] = [];
  const limiter = new RateLimiter(2, 5000); // 2 concurrent, 5 seconds between API calls
  const collectionPrefix = collection.slice(0, 3); // "cat", "dog", etc.

  for (let i = 0; i < batchSize; i++) {
    await limiter.throttle(async () => {
      const startTime = Date.now();
      const timestamp = Date.now();
      const variantPrompt = getRandomVariant(category, collection);

      // Generate slug-based ID from variant prompt
      const id = generateSlugFromPrompt(variantPrompt, collection, timestamp);

      // Construct Full Prompt (keep under 1000 chars for Recraft API limit)
      const fullPrompt = `${promptConfig.base}\n\nSCENE: ${variantPrompt}`;

      try {
        logger.info(`[${i + 1}/${batchSize}] Generating`, {
          id,
          variant: variantPrompt.substring(0, 40)
        });

        // 1. Generate image with negative prompt passed separately
        const imageBuffer = await generateImage(fullPrompt, promptConfig.negative_prompt);

        // 2. Upload to R2 and CF Images
        const filename = `${id}.png`;
        const uploadResult = await uploadImage(imageBuffer, filename, collection);

        // 3. Create Draft Markdown with full metadata
        const template = collectionMeta.cms_frontmatter_template || {
          type: 'coloring-pages',
          difficulty: 'Easy',
          style: 'Bold',
          medium: 'Markers'
        };

        // Generate SEO-optimized content
        const title = generateTitle(variantPrompt);
        const seoDescription = generateSEODescription(variantPrompt, template.difficulty || 'Easy', template.style || 'Bold');
        const pinterestDescription = generatePinterestDescription(
          variantPrompt,
          template.difficulty || 'Easy',
          template.style || 'Bold',
          template.medium || 'Markers'
        );

        const mdContent = `---
title: "${title}"
description: "${seoDescription}"
pinterest_description: "${pinterestDescription}"
date: ${new Date().toISOString()}
type: "${template.type || 'coloring-pages'}"
draft: true
categories:
  - ${category}
collections:
  - ${collection}
difficulty: "${template.difficulty || 'Easy'}"
style: "${template.style || 'Bold'}"
medium: "${template.medium || 'Markers'}"
cf_image_id: "${uploadResult.cfImageId}"
image_url: "${uploadResult.imageUrl}"
download_url: "${uploadResult.downloadUrl}"
r2_original: "${uploadResult.r2Url}"
prompt: "${variantPrompt}"
tags:
  - ${variantPrompt.trim().split(/\s+/)[0]}
---

A beautiful ${collection} coloring page generated by AI. This printable coloring page features a cute ${collection.slice(0, -1)} in the style shown above.

**Difficulty:** ${template.difficulty || 'Easy'}  
**Style:** ${template.style || 'Bold'} and simple lines, perfect for all ages  
**Medium:** ${template.medium || 'Markers'}, crayons, or colored pencils

---

![Coloring Page](${uploadResult.imageUrl})
`;

        const mdPath = path.join(contentDir, `${id}.md`);
        await fs.writeFile(mdPath, mdContent);

        const duration = Date.now() - startTime;
        logger.success(`[${i + 1}/${batchSize}] Complete`, {
          id,
          path: mdPath,
          duration: `${duration}ms`
        });

        results.push({
          id,
          status: 'success',
          path: mdPath,
          duration
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);

        logger.error(`[${i + 1}/${batchSize}] Generation failed`, error as Error);

        results.push({
          id,
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
