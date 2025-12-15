import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { logger } from './logger';

const CONTENT_DIR = path.resolve(__dirname, '../../../content');

export interface IndexMetadata {
  title?: string;
  h1?: string;
  description?: string;
  image_url?: string;
  cms_enabled?: boolean;
  cms_batch_size?: number;
  cms_frontmatter_template?: {
    type?: string;
    difficulty?: string;
    style?: string;
    medium?: string;
  };
  [key: string]: any;
}

export interface Category {
  name: string;
  path: string;
  metadata: IndexMetadata;
}

export interface Collection {
  name: string;
  category: string;
  path: string;
  metadata: IndexMetadata;
}

/**
 * Scan content/ directory and discover all categories
 */
export function scanCategories(): Category[] {
  const categories: Category[] = [];
  
  try {
    const contentPath = path.join(CONTENT_DIR);
    if (!fs.existsSync(contentPath)) {
      logger.warn('Content directory does not exist');
      return categories;
    }

    const items = fs.readdirSync(contentPath);
    
    for (const item of items) {
      const itemPath = path.join(contentPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && !item.startsWith('.') && item !== 'pages') {
        const indexPath = path.join(itemPath, '_index.md');
        if (fs.existsSync(indexPath)) {
          const metadata = readIndexFile(indexPath);
          categories.push({
            name: item,
            path: itemPath,
            metadata
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error scanning categories', error as Error);
  }
  
  return categories;
}

/**
 * Scan a category and discover all collections
 */
export function scanCollections(category: string): Collection[] {
  const collections: Collection[] = [];
  
  try {
    const categoryPath = path.join(CONTENT_DIR, category);
    if (!fs.existsSync(categoryPath)) {
      logger.warn(`Category directory not found: ${category}`);
      return collections;
    }

    const items = fs.readdirSync(categoryPath);
    
    for (const item of items) {
      if (item === '_index.md') continue;
      
      const itemPath = path.join(categoryPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && !item.startsWith('.')) {
        const indexPath = path.join(itemPath, '_index.md');
        if (fs.existsSync(indexPath)) {
          const metadata = readIndexFile(indexPath);
          collections.push({
            name: item,
            category,
            path: itemPath,
            metadata
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Error scanning collections in ${category}`, error as Error);
  }
  
  return collections;
}

/**
 * Read _index.md and parse frontmatter
 */
export function readIndexFile(filePath: string): IndexMetadata {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`Index file not found: ${filePath}`);
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(content);
    return parsed.data as IndexMetadata;
  } catch (error) {
    logger.error(`Error reading index file ${filePath}`, error as Error);
    return {};
  }
}

/**
 * Write updated frontmatter to _index.md
 */
export function updateIndexFile(filePath: string, frontmatter: Partial<IndexMetadata>): void {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`Index file not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(content);
    
    // Merge new frontmatter with existing
    const updated = { ...parsed.data, ...frontmatter };
    
    const newContent = matter.stringify(parsed.content, updated);
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    logger.success(`Updated index file: ${filePath}`);
  } catch (error) {
    logger.error(`Error updating index file ${filePath}`, error as Error);
    throw error;
  }
}

/**
 * Create a new category directory + _index.md
 */
export function createCategory(name: string, metadata: Partial<IndexMetadata> = {}): Category {
  try {
    const categoryPath = path.join(CONTENT_DIR, name);
    
    if (fs.existsSync(categoryPath)) {
      throw new Error(`Category already exists: ${name}`);
    }

    // Create directory
    fs.ensureDirSync(categoryPath);

    // Create _index.md with default metadata
    const defaultMetadata: IndexMetadata = {
      title: name.charAt(0).toUpperCase() + name.slice(1),
      ...metadata
    };

    const indexPath = path.join(categoryPath, '_index.md');
    const content = matter.stringify('', defaultMetadata);
    fs.writeFileSync(indexPath, content, 'utf8');

    logger.success(`Created category: ${name}`);

    return {
      name,
      path: categoryPath,
      metadata: defaultMetadata
    };
  } catch (error) {
    logger.error(`Error creating category ${name}`, error as Error);
    throw error;
  }
}

/**
 * Create a new collection directory + _index.md
 */
export function createCollection(
  category: string,
  name: string,
  metadata: Partial<IndexMetadata> = {}
): Collection {
  try {
    const categoryPath = path.join(CONTENT_DIR, category);
    
    if (!fs.existsSync(categoryPath)) {
      throw new Error(`Category does not exist: ${category}`);
    }

    const collectionPath = path.join(categoryPath, name);
    
    if (fs.existsSync(collectionPath)) {
      throw new Error(`Collection already exists: ${category}/${name}`);
    }

    // Create directory
    fs.ensureDirSync(collectionPath);

    // Create _index.md with default metadata
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    const defaultMetadata: IndexMetadata = {
      title: capitalizedName,
      h1: `Free Printable Coloring Pages Of ${capitalizedName}`,
      cms_enabled: true,
      cms_batch_size: 5,
      cms_frontmatter_template: {
        type: 'coloring-pages',
        difficulty: 'Easy',
        style: 'Bold',
        medium: 'Markers'
      },
      ...metadata
    };

    const indexPath = path.join(collectionPath, '_index.md');
    const content = matter.stringify('', defaultMetadata);
    fs.writeFileSync(indexPath, content, 'utf8');

    logger.success(`Created collection: ${category}/${name}`);

    return {
      name,
      category,
      path: collectionPath,
      metadata: defaultMetadata
    };
  } catch (error) {
    logger.error(`Error creating collection ${category}/${name}`, error as Error);
    throw error;
  }
}

/**
 * Delete a category (with validation - must be empty)
 */
export function deleteCategory(name: string): void {
  try {
    const categoryPath = path.join(CONTENT_DIR, name);
    
    if (!fs.existsSync(categoryPath)) {
      throw new Error(`Category not found: ${name}`);
    }

    const items = fs.readdirSync(categoryPath);
    const hasCollections = items.some(item => item !== '_index.md' && !item.startsWith('.'));
    
    if (hasCollections) {
      throw new Error(`Cannot delete category with collections: ${name}`);
    }

    fs.removeSync(categoryPath);
    logger.success(`Deleted category: ${name}`);
  } catch (error) {
    logger.error(`Error deleting category ${name}`, error as Error);
    throw error;
  }
}

/**
 * Delete a collection (with safety validation)
 */
export function deleteCollection(category: string, name: string): void {
  try {
    const collectionPath = path.join(CONTENT_DIR, category, name);
    
    if (!fs.existsSync(collectionPath)) {
      throw new Error(`Collection not found: ${category}/${name}`);
    }

    // Check for content files (allow only _index.md)
    const items = fs.readdirSync(collectionPath);
    const hasContent = items.some(item => item !== '_index.md' && !item.startsWith('.'));
    
    if (hasContent) {
      logger.warn(`Collection has content files: ${category}/${name}`);
      // Note: We still allow deletion, but log a warning
    }

    fs.removeSync(collectionPath);
    logger.success(`Deleted collection: ${category}/${name}`);
  } catch (error) {
    logger.error(`Error deleting collection ${category}/${name}`, error as Error);
    throw error;
  }
}

/**
 * Get category by name
 */
export function getCategory(name: string): Category | null {
  try {
    const categoryPath = path.join(CONTENT_DIR, name);
    if (!fs.existsSync(categoryPath)) {
      return null;
    }

    const indexPath = path.join(categoryPath, '_index.md');
    if (!fs.existsSync(indexPath)) {
      return null;
    }

    const metadata = readIndexFile(indexPath);
    return {
      name,
      path: categoryPath,
      metadata
    };
  } catch (error) {
    logger.error(`Error getting category ${name}`, error as Error);
    return null;
  }
}

/**
 * Get collection by category and name
 */
export function getCollection(category: string, name: string): Collection | null {
  try {
    const collectionPath = path.join(CONTENT_DIR, category, name);
    if (!fs.existsSync(collectionPath)) {
      return null;
    }

    const indexPath = path.join(collectionPath, '_index.md');
    if (!fs.existsSync(indexPath)) {
      return null;
    }

    const metadata = readIndexFile(indexPath);
    return {
      name,
      category,
      path: collectionPath,
      metadata
    };
  } catch (error) {
    logger.error(`Error getting collection ${category}/${name}`, error as Error);
    return null;
  }
}

