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
  // Preserve original newline style for minimal diffs
  const NL = content.includes('\r\n') ? '\r\n' : '\n';

  // Match the top frontmatter block (supports LF and CRLF)
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatterMatch) {
    return { updated: false, content };
  }

  const frontmatter = frontmatterMatch[1];
  const afterFrontmatter = content.substring(frontmatterMatch[0].length);

  // Check if tags field exists
  if (!frontmatter.includes('tags:')) {
    return { updated: false, content };
  }

  // Line-based removal to avoid YAML re-serialization and to handle CRLF/LF consistently.
  const lines = frontmatter.split(/\r?\n/);
  const out: string[] = [];
  let removed = false;
  let skippingTagsBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of tags field (either `tags:` or `tags: [...]`)
    if (!skippingTagsBlock && /^tags:\s*(?:\[[^\]]*\])?\s*$/.test(line)) {
      removed = true;
      skippingTagsBlock = true;
      continue;
    }

    if (skippingTagsBlock) {
      // YAML list items are typically indented. Skip until we hit the next top-level key.
      // - list items like: "  - Foo"
      // - allow blank lines inside the skipped block
      if (line.trim() === '' || /^\s+-\s+/.test(line)) {
        continue;
      }
      // End of tags block: next non-list, non-empty line
      skippingTagsBlock = false;
      // fallthrough to keep this line
    }

    out.push(line);
  }

  if (!removed) {
    return { updated: false, content };
  }

  // Minor cleanup: if we created a double blank line around removal, collapse just one run.
  const cleaned: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const prev = cleaned.length > 0 ? cleaned[cleaned.length - 1] : null;
    if (prev !== null && prev.trim() === '' && out[i].trim() === '') continue;
    cleaned.push(out[i]);
  }

  const updatedFrontmatter = cleaned.join(NL);
  const newContent = `---${NL}${updatedFrontmatter}${NL}---${NL}${afterFrontmatter}`;
  return { updated: true, content: newContent };
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

