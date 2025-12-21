import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { globSync } from 'glob';
import { logger } from './morning-routine/lib/logger';

/**
 * Validate taxonomy structure for all content files
 * NOTE: This validator intentionally does NOT validate categories/collections.
 * It only enforces lightweight, future-proof invariants (e.g., deprecated fields).
 */

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
    // Normalize path to use forward slashes for cross-platform consistency
    const normalizedFile = file.replace(/\\/g, '/');

    if (normalizedFile.includes('_index')) {
      continue; // Skip section index files
    }

    result.total++;

    try {
      const content = await fs.readFile(file, 'utf8');
      const parsed = matter(content);
      const frontmatter = parsed.data;

      let hasErrors = false;

      // Global policy: tags must never exist in content frontmatter
      if (frontmatter.tags) {
        result.errors.push({
          file,
          type: 'deprecated_tags_present',
          message: 'Deprecated field "tags" is present in frontmatter (must be removed)'
        });
        hasErrors = true;
      }

      // Intentionally no categories/collections validation.

      // (Optional) add other lightweight invariants here, but avoid validating taxonomy values.

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

