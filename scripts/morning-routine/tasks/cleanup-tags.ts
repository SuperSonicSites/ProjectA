/**
 * Surgical frontmatter cleanup: Remove tags field from content without re-serializing YAML
 * 
 * This script iterates through all Markdown files and removes the "tags:" key and its value(s)
 * without rewriting the rest of the frontmatter, preserving formatting and key order.
 * 
 * Usage:
 *   npx ts-node scripts/morning-routine/tasks/cleanup-tags.ts
 */

import fs from 'fs-extra';
import path from 'path';
import { globSync } from 'glob';
import { logger } from '../lib/logger';

const CONTENT_DIR = path.resolve(__dirname, '../../../content');

/**
 * Surgically remove tags from frontmatter without touching other fields
 */
function removeTagsFromFrontmatter(content: string): { updated: boolean; content: string } {
  // Match the frontmatter block (---\n...---\n)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    return { updated: false, content };
  }

  const frontmatter = frontmatterMatch[1];
  const beforeFrontmatter = '';
  const afterFrontmatter = content.substring(frontmatterMatch[0].length);

  // Check if tags field exists
  if (!frontmatter.includes('tags:')) {
    return { updated: false, content };
  }

  // Remove tags field (handles both single-line and multi-line)
  // Pattern 1: tags with single-line array (tags: [...])
  const singleLinePattern = /^tags:\s*\[.*?\]\s*$/m;
  let updated = frontmatter.replace(singleLinePattern, '');

  // Pattern 2: tags with multi-line list (tags:\n  - value\n  - value)
  const multiLinePattern = /^tags:\s*\n(?:  - [^\n]*\n)*/m;
  if (updated === frontmatter) {
    updated = frontmatter.replace(multiLinePattern, '');
  }

  // If nothing changed, tags might be in a different format; try more aggressive match
  if (updated === frontmatter) {
    const aggressivePattern = /^tags:[\s\S]*?(?=\n[a-z_]|\n---|\Z)/m;
    updated = frontmatter.replace(aggressivePattern, '');
  }

  // Clean up any double newlines that may have resulted
  updated = updated.replace(/\n\n+/g, '\n');

  const newContent = `---\n${updated}\n---\n${afterFrontmatter}`;
  return { updated: updated !== frontmatter, content: newContent };
}

async function cleanupTags() {
  logger.info('Starting surgical tag cleanup across all content...');

  const files = globSync(path.join(CONTENT_DIR, '**/*.md').replace(/\\/g, '/'));
  let modified = 0;
  let skipped = 0;

  for (const file of files) {
    // Skip index files
    if (path.basename(file) === '_index.md') {
      skipped++;
      continue;
    }

    try {
      const content = await fs.readFile(file, 'utf8');
      const { updated, content: newContent } = removeTagsFromFrontmatter(content);

      if (updated) {
        await fs.writeFile(file, newContent);
        modified++;
        logger.info(`Removed tags from: ${path.relative(CONTENT_DIR, file)}`);
      }
    } catch (error) {
      logger.error(`Error processing ${file}`, error as Error);
    }
  }

  logger.success(`Cleanup complete.`, {
    processed: files.length,
    modified,
    skipped
  });
}

if (require.main === module) {
  cleanupTags().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { cleanupTags };

