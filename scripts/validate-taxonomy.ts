import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { globSync } from 'glob';
import { logger } from './morning-routine/lib/logger';

/**
 * Validate taxonomy structure for all content files
 * Ensures categories and collections match allowed values
 */

const ALLOWED_CATEGORIES = [
  'animals',
  'mandalas',
  'holidays',
  'fantasy',
  'educational'
];

const ALLOWED_COLLECTIONS = {
  animals: ['cats', 'dogs', 'butterflies', 'horses', 'bears', 'dinosaurs', 'forest'],
  mandalas: ['geometric', 'floral', 'abstract'],
  holidays: ['christmas', 'halloween', 'easter', 'thanksgiving'],
  fantasy: ['fairies', 'mermaids', 'goth', 'dragons'],
  educational: ['math', 'alphabet', 'science', 'history']
};

interface ValidationError {
  file: string;
  type: string;
  message: string;
}

interface ValidationResult {
  total: number;
  valid: number;
  errors: ValidationError[];
}

async function validateTaxonomy(): Promise<ValidationResult> {
  logger.info('Starting taxonomy validation...');

  const result: ValidationResult = {
    total: 0,
    valid: 0,
    errors: []
  };

  // Find all markdown files
  const mdFiles = globSync('content/**/*.md', {
    ignore: ['node_modules/**', 'public/**']
  });

  logger.info(`Found ${mdFiles.length} markdown files to validate`);

  for (const file of mdFiles) {
    if (file.includes('_index')) {
      continue; // Skip section index files
    }

    result.total++;

    try {
      const content = await fs.readFile(file, 'utf8');
      const parsed = matter(content);
      const frontmatter = parsed.data;

      let hasErrors = false;

      // Check if file has categories
      if (!frontmatter.categories || frontmatter.categories.length === 0) {
        result.errors.push({
          file,
          type: 'missing_category',
          message: 'Missing categories in frontmatter'
        });
        hasErrors = true;
      } else {
        // Validate each category
        for (const category of frontmatter.categories) {
          if (!ALLOWED_CATEGORIES.includes(category)) {
            result.errors.push({
              file,
              type: 'invalid_category',
              message: `Invalid category "${category}". Allowed: ${ALLOWED_CATEGORIES.join(', ')}`
            });
            hasErrors = true;
          }
        }
      }

      // Check if file has collections
      if (!frontmatter.collections || frontmatter.collections.length === 0) {
        result.errors.push({
          file,
          type: 'missing_collection',
          message: 'Missing collections in frontmatter'
        });
        hasErrors = true;
      } else {
        // Validate each collection matches its category
        const category = frontmatter.categories?.[0];
        for (const collection of frontmatter.collections) {
          const allowed = ALLOWED_COLLECTIONS[category as keyof typeof ALLOWED_COLLECTIONS] || [];
          if (!allowed.includes(collection)) {
            result.errors.push({
              file,
              type: 'invalid_collection',
              message: `Invalid collection "${collection}" for category "${category}". Allowed: ${allowed.join(', ')}`
            });
            hasErrors = true;
          }
        }
      }

      // Check required fields for coloring pages
      if (frontmatter.type === 'coloring-pages') {
        const requiredFields = ['difficulty', 'style'];
        for (const field of requiredFields) {
          if (!frontmatter[field]) {
            result.errors.push({
              file,
              type: 'missing_field',
              message: `Missing required field: ${field}`
            });
            hasErrors = true;
          }
        }
      }

      if (!hasErrors) {
        result.valid++;
      }
    } catch (error) {
      result.errors.push({
        file,
        type: 'parse_error',
        message: `Failed to parse: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  // Log results
  console.log('\n' + '='.repeat(80));
  logger.success(`Taxonomy validation complete`, {
    total: result.total,
    valid: result.valid,
    errors: result.errors.length
  });
  console.log('='.repeat(80) + '\n');

  if (result.errors.length > 0) {
    logger.warn(`Found ${result.errors.length} validation error(s):\n`);
    
    // Group errors by file
    const errorsByFile: Record<string, ValidationError[]> = {};
    for (const error of result.errors) {
      if (!errorsByFile[error.file]) {
        errorsByFile[error.file] = [];
      }
      errorsByFile[error.file].push(error);
    }

    for (const [file, errors] of Object.entries(errorsByFile)) {
      console.log(`\n📄 ${file}`);
      for (const error of errors) {
        console.log(`   ❌ [${error.type}] ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Allowed categories:', ALLOWED_CATEGORIES.join(', '));
    console.log('\nAllowed collections by category:');
    for (const [category, collections] of Object.entries(ALLOWED_COLLECTIONS)) {
      console.log(`  ${category}: ${collections.join(', ')}`);
    }
    console.log('='.repeat(80) + '\n');

    return result;
  }

  logger.success('All files have valid taxonomy!');
  return result;
}

// Allow direct execution
if (require.main === module) {
  validateTaxonomy()
    .then(result => {
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      logger.error('Validation failed', error);
      process.exit(1);
    });
}

export { validateTaxonomy };

