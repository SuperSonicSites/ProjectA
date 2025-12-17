/**
 * Batch SEO review and optimization for generated coloring pages
 * 
 * Usage:
 *   npx ts-node scripts/morning-routine/tasks/seo-review-batch.ts <category> <collection> [--manifest <file>] [--drafts-only]
 * 
 * If --manifest is provided, only files in that manifest are reviewed.
 * Otherwise, all markdown files in the collection are reviewed.
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { reviewSEO, SEOValidationError } from '../../../.agents/seo-copywriter';
import { updateContentFrontmatter, listContent } from '../lib/content-manager';
import { RateLimiter } from '../lib/rate-limiter';
import { logger } from '../lib/logger';

interface ReviewResult {
  file: string;
  status: 'success' | 'failed';
  error?: string;
  duration?: number;
}

interface GenerationManifest {
  runId: string;
  created: string[];
}

async function readManifest(manifestPath: string): Promise<GenerationManifest | null> {
  try {
    if (!fs.existsSync(manifestPath)) {
      logger.warn(`Manifest not found: ${manifestPath}`);
      return null;
    }
    const content = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(content) as GenerationManifest;
  } catch (error) {
    logger.error('Error reading manifest', error as Error);
    return null;
  }
}

/**
 * Review and optimize SEO metadata for a batch of markdown files
 */
export async function reviewBatch(
  category: string,
  collection: string,
  filesToReview?: string[]
): Promise<ReviewResult[]> {
  let targetFiles: Array<{ path: string; filename: string }>;

  if (filesToReview && filesToReview.length > 0) {
    // Use provided file list
    targetFiles = filesToReview.map(f => {
      const filename = path.basename(f);
      return { path: f, filename };
    });
  } else {
    // Scan collection for all markdown files
    const contentFiles = listContent(category, collection);
    targetFiles = contentFiles.map(f => ({
      path: f.path,
      filename: f.filename
    }));
  }

  if (targetFiles.length === 0) {
    logger.info(`No files to review in ${category}/${collection}`);
    return [];
  }

  logger.info(`Starting SEO review for ${targetFiles.length} file(s)`, {
    category,
    collection
  });

  const results: ReviewResult[] = [];
  const limiter = new RateLimiter(2, 5000); // 2 concurrent, 5s delay

  for (let i = 0; i < targetFiles.length; i++) {
    const file = targetFiles[i];

    await limiter.throttle(async () => {
      const startTime = Date.now();

      try {
        logger.info(`[${i + 1}/${targetFiles.length}] Reviewing`, {
          file: file.filename
        });

        // Read frontmatter
        const content = await fs.readFile(file.path, 'utf8');
        const parsed = matter(content);
        const fm: any = parsed.data || {};

        // Determine image URL
        const imageUrl = (fm.image_url as string) || (fm.r2_original as string) || '';
        if (!imageUrl) {
          throw new Error('Missing image_url and r2_original in frontmatter');
        }

        // Determine subject
        const subject = Array.isArray(fm.collections)
          ? (fm.collections[0] as string)
          : collection;

        const style = String(fm.style || 'Kawaii');
        const medium = String(fm.medium || 'Markers');

        // Call SEO agent
        const seoResult = await reviewSEO({
          imageUrl,
          subject,
          style,
          medium,
          originalPrompt: typeof fm.prompt === 'string' ? fm.prompt : undefined
        });

        // Update the file with SEO-optimized fields only
        updateContentFrontmatter(file.path, seoResult);

        const duration = Date.now() - startTime;
        logger.success(`[${i + 1}/${targetFiles.length}] Optimized`, {
          file: file.filename,
          duration: `${duration}ms`
        });

        results.push({
          file: file.filename,
          status: 'success',
          duration
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);

        logger.error(`[${i + 1}/${targetFiles.length}] Failed`, error as Error);

        results.push({
          file: file.filename,
          status: 'failed',
          error: errorMsg,
          duration
        });
      }
    });
  }

  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  logger.info('Batch SEO review complete', {
    category,
    collection,
    total: targetFiles.length,
    successful,
    failed
  });

  return results;
}

// CLI execution
if (require.main === module) {
  (async () => {
    const category = process.argv[2] || 'animals';
    const collection = process.argv[3] || 'cats';
    const manifestFlag = process.argv.indexOf('--manifest');
    const manifestPath = manifestFlag !== -1 ? process.argv[manifestFlag + 1] : undefined;

    let filesToReview: string[] | undefined;

    // If manifest provided, read it
    if (manifestPath) {
      const manifest = await readManifest(manifestPath);
      if (manifest) {
        filesToReview = manifest.created;
        logger.info(`Loaded manifest with ${filesToReview.length} file(s)`, {
          runId: manifest.runId
        });
      }
    }

    try {
      const results = await reviewBatch(category, collection, filesToReview);

      const failed = results.filter(r => r.status === 'failed').length;
      console.log('\n');
      console.log(JSON.stringify(results, null, 2));

      // Exit with error code if any failed
      process.exit(failed > 0 ? 1 : 0);
    } catch (error) {
      logger.error('Batch SEO review failed', error as Error);
      process.exit(1);
    }
  })();
}
