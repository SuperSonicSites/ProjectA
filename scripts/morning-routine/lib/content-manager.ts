import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { globSync } from 'glob';
import { logger } from './logger';

const CONTENT_DIR = path.resolve(__dirname, '../../../content');

export interface ContentFile {
  filename: string;
  path: string;
  frontmatter: any;
  content: string;
  draft: boolean;
}

/**
 * List content files in a collection
 */
export function listContent(
  category: string,
  collection: string,
  draftOnly?: boolean
): ContentFile[] {
  const contentFiles: ContentFile[] = [];

  try {
    const collectionPath = path.join(CONTENT_DIR, category, collection);
    if (!fs.existsSync(collectionPath)) {
      logger.warn(`Collection path not found: ${category}/${collection} (full path: ${collectionPath})`);
      return contentFiles;
    }

    // Find all .md files except _index.md
    const searchPath = path
      .join(collectionPath, '*.md')
      .replace(/\\/g, '/');
    const files = globSync(searchPath);

    for (const file of files) {
      if (path.basename(file) === '_index.md') continue;

      const content = fs.readFileSync(file, 'utf8');
      const parsed = matter(content);
      const isDraft = parsed.data.draft === true;

      // Filter based on draft status
      if (draftOnly !== undefined && isDraft !== draftOnly) {
        continue;
      }

      contentFiles.push({
        filename: path.basename(file),
        path: file,
        frontmatter: parsed.data,
        content: parsed.content,
        draft: isDraft
      });
    }
  } catch (error) {
    logger.error(`Error listing content in ${category}/${collection}`, error as Error);
  }

  return contentFiles;
}

/**
 * Update frontmatter of a content file
 */
export function updateContentFrontmatter(
  filepath: string,
  frontmatter: Record<string, any>
): void {
  try {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Content file not found: ${filepath}`);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const parsed = matter(content);

    // Merge new frontmatter with existing
    const updated = { ...parsed.data, ...frontmatter };

    // Global policy: tags must never exist in content frontmatter going forward
    // (prevents accidental reintroduction via automation like SEO review scripts)
    if (Object.prototype.hasOwnProperty.call(updated, 'tags')) {
      delete (updated as any).tags;
    }

    const newContent = matter.stringify(parsed.content, updated);
    fs.writeFileSync(filepath, newContent, 'utf8');

    logger.success(`Updated content: ${path.basename(filepath)}`);
  } catch (error) {
    logger.error(`Error updating content ${filepath}`, error as Error);
    throw error;
  }
}

/**
 * Delete a content file
 */
export function deleteContent(filepath: string): void {
  try {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Content file not found: ${filepath}`);
    }

    fs.removeSync(filepath);
    logger.success(`Deleted content: ${path.basename(filepath)}`);
  } catch (error) {
    logger.error(`Error deleting content ${filepath}`, error as Error);
    throw error;
  }
}

/**
 * Get a single content file
 */
export function getContent(
  category: string,
  collection: string,
  filename: string
): ContentFile | null {
  try {
    const filepath = path.join(CONTENT_DIR, category, collection, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const parsed = matter(content);

    return {
      filename,
      path: filepath,
      frontmatter: parsed.data,
      content: parsed.content,
      draft: parsed.data.draft === true
    };
  } catch (error) {
    logger.error(`Error getting content ${category}/${collection}/${filename}`, error as Error);
    return null;
  }
}

/**
 * Approve a content file (set draft to false)
 */
export function approveContent(filepath: string): void {
  updateContentFrontmatter(filepath, { draft: false });
}

/**
 * Count content in a collection
 */
export function countContent(
  category: string,
  collection: string,
  draftOnly?: boolean
): number {
  return listContent(category, collection, draftOnly).length;
}

