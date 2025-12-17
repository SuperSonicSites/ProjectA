import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { reviewSEO, SEOReviewOutput, SEOValidationError } from '../../../.agents/seo-copywriter';
import { logger } from '../lib/logger';
import { updateContentFrontmatter } from '../lib/content-manager';

type Frontmatter = Record<string, any>;

function getArgFlag(name: string): boolean {
  return process.argv.includes(name);
}

function stringifyValue(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function printDiff(oldFm: Frontmatter, updates: Partial<SEOReviewOutput>) {
  const fields: Array<keyof SEOReviewOutput> = [
    'title',
    'description',
    'pinterest_title',
    'pinterest_description',
    'prompt'
  ];

  console.log('\n--- Proposed frontmatter changes (dry-run) ---\n');
  for (const f of fields) {
    const oldVal = stringifyValue(oldFm[f as string]);
    const newVal = stringifyValue((updates as any)[f]);
    if (!newVal) continue;
    if (oldVal === newVal) continue;
    console.log(`${String(f)}:`);
    console.log(`- old: ${JSON.stringify(oldVal)}`);
    console.log(`+ new: ${JSON.stringify(newVal)}\n`);
  }
}

async function run() {
  const jsonOnly = getArgFlag('--json');
  const verbose = getArgFlag('--verbose');
  const liveUpdate = getArgFlag('--live');

  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const category = args[0];
  const collection = args[1];
  const filename = args[2];

  if (!category || !collection || !filename) {
    console.error('Usage: ts-node scripts/morning-routine/tasks/seo-review-one.ts <category> <collection> <filename> [--json] [--verbose] [--live]');
    process.exit(2);
  }

  const mdPath = path.resolve(__dirname, '../../../content', category, collection, filename);
  if (!fs.existsSync(mdPath)) {
    throw new Error(`Markdown file not found: ${mdPath}`);
  }

  const raw = await fs.readFile(mdPath, 'utf8');
  const parsed = matter(raw);
  const fm = (parsed.data || {}) as Frontmatter;

  const imageUrl = (fm.image_url as string) || (fm.r2_original as string) || '';
  if (!imageUrl) {
    throw new Error('Missing image_url and r2_original in frontmatter; cannot run vision review.');
  }

  const subject =
    (Array.isArray(fm.collections) ? String(fm.collections[0] || '') : String(fm.collections || '')) ||
    collection;
  const style = String(fm.style || '');
  const medium = String(fm.medium || 'Markers');

  if (verbose) {
    logger.info('SEO review context', { mdPath, imageUrl, subject, style, medium });
  }

  const output = await reviewSEO({
    imageUrl,
    subject,
    style,
    medium,
    originalPrompt: typeof fm.prompt === 'string' ? fm.prompt : undefined
  });

  if (jsonOnly) {
    console.log(JSON.stringify(output, null, 2));
    if (liveUpdate) {
      // Still update even in JSON mode if --live is set
      updateContentFrontmatter(mdPath, output);
      logger.success('File updated successfully');
    }
    return;
  }

  console.log('\n--- Model JSON output ---\n');
  console.log(JSON.stringify(output, null, 2));

  printDiff(fm, output);

  if (liveUpdate) {
    console.log('\n--- Writing changes to file... ---\n');
    updateContentFrontmatter(mdPath, output);
    logger.success(`✅ File updated successfully: ${mdPath}\n`);
  } else {
    console.log(`\nNo changes were written. File: ${mdPath}`);
    console.log('💡 Tip: Use --live flag to write changes to the file\n');
  }
}

if (require.main === module) {
  run().catch(err => {
    const msg = err instanceof Error ? err.message : String(err);
    if (err instanceof SEOValidationError) {
      logger.error('SEO review failed', err);
      console.error('\nValidation details:\n' + JSON.stringify(err.details || {}, null, 2));
    } else {
      logger.error('SEO review failed', err as Error);
    }
    console.error(msg);
    process.exit(1);
  });
}


