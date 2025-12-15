import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import {
  scanCategories,
  scanCollections,
  readIndexFile,
  updateIndexFile,
  createCategory,
  createCollection,
  deleteCategory,
  deleteCollection,
  getCategory,
  getCollection
} from '../lib/hugo-manager';
import {
  listContent,
  getContent,
  updateContentFrontmatter,
  deleteContent,
  approveContent,
  countContent
} from '../lib/content-manager';
import { loadPrompt, savePrompt, listAllPrompts, createDefaultPrompt } from '../lib/prompt-manager';
import { generateBatch } from '../tasks/generate-batch';
import { deleteImage } from '../lib/storage';
import { deleteFromCloudflareImages } from '../lib/cf-images';
import { ENV } from '../config/env';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'ui')));

let isGenerating = false;

// ============================================================================
// CATEGORY ENDPOINTS
// ============================================================================

app.get('/api/categories', async (req, res) => {
  try {
    const categories = scanCategories();
    const withCounts = categories.map(cat => {
      const collections = scanCollections(cat.name);
      return {
        ...cat,
        collectionCount: collections.length
      };
    });
    res.json(withCounts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/categories/:name', async (req, res) => {
  try {
    const category = getCategory(req.params.name);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, metadata } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const category = createCategory(name, metadata);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/categories/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const metadata = req.body;

    const category = getCategory(name);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const indexPath = path.join(path.resolve(__dirname, '../../../content'), name, '_index.md');
    updateIndexFile(indexPath, metadata);

    const updated = getCategory(name);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/categories/:name', async (req, res) => {
  try {
    deleteCategory(req.params.name);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// COLLECTION ENDPOINTS
// ============================================================================

app.get('/api/collections', async (req, res) => {
  try {
    const categories = scanCategories();
    const allCollections = [];

    for (const category of categories) {
      const collections = scanCollections(category.name);
      for (const collection of collections) {
        const draftCount = countContent(category.name, collection.name, true);
        const publishedCount = countContent(category.name, collection.name, false);

        allCollections.push({
          ...collection,
          draftCount,
          publishedCount
        });
      }
    }

    res.json(allCollections);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/collections/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const collections = scanCollections(category);
    const withCounts = collections.map(col => ({
      ...col,
      draftCount: countContent(category, col.name, true),
      publishedCount: countContent(category, col.name, false)
    }));
    res.json(withCounts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/collections/:category/:name', async (req, res) => {
  try {
    const { category, name } = req.params;
    const collection = getCollection(category, name);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    const draftCount = countContent(category, name, true);
    const publishedCount = countContent(category, name, false);
    res.json({
      ...collection,
      draftCount,
      publishedCount
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/collections', async (req, res) => {
  try {
    const { category, name, metadata } = req.body;
    if (!category || !name) {
      return res.status(400).json({ error: 'Category and name are required' });
    }

    // Create collection directory and _index.md
    const collection = createCollection(category, name, metadata);

    // Create default prompt
    createDefaultPrompt(category, name);

    res.json(collection);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/collections/:category/:name', async (req, res) => {
  try {
    const { category, name } = req.params;
    const metadata = req.body;

    const collection = getCollection(category, name);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const contentDir = path.resolve(__dirname, '../../../content');
    const indexPath = path.join(contentDir, category, name, '_index.md');
    updateIndexFile(indexPath, metadata);

    const updated = getCollection(category, name);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/collections/:category/:name', async (req, res) => {
  try {
    const { category, name } = req.params;
    deleteCollection(category, name);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// CONTENT ENDPOINTS
// ============================================================================

app.get('/api/content/:category/:collection', async (req, res) => {
  try {
    const { category, collection } = req.params;
    const { draft } = req.query;

    let draftOnly: boolean | undefined;
    if (draft === 'true') draftOnly = true;
    if (draft === 'false') draftOnly = false;

    const content = listContent(category, collection, draftOnly);
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/drafts/:category/:collection', async (req, res) => {
  try {
    const { category, collection } = req.params;
    const drafts = listContent(category, collection, true);
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/content/:category/:collection/:filename', async (req, res) => {
  try {
    const { category, collection, filename } = req.params;
    const content = getContent(category, collection, filename);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/content/:category/:collection/:filename', async (req, res) => {
  try {
    const { category, collection, filename } = req.params;
    const frontmatter = req.body;

    const contentDir = path.resolve(__dirname, '../../../content');
    const filepath = path.join(contentDir, category, collection, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Content not found' });
    }

    updateContentFrontmatter(filepath, frontmatter);
    const updated = getContent(category, collection, filename);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/content/:category/:collection/:filename/approve', async (req, res) => {
  try {
    const { category, collection, filename } = req.params;

    const contentDir = path.resolve(__dirname, '../../../content');
    const filepath = path.join(contentDir, category, collection, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Content not found' });
    }

    approveContent(filepath);
    const updated = getContent(category, collection, filename);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/content/:category/:collection/:filename', async (req, res) => {
  try {
    const { category, collection, filename } = req.params;

    const contentDir = path.resolve(__dirname, '../../../content');
    const filepath = path.join(contentDir, category, collection, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Get content to retrieve asset URLs
    const content = getContent(category, collection, filename);
    if (content) {
      // Delete from R2 storage if URL exists
      const imageUrl = content.frontmatter.r2_original || content.frontmatter.image_url;
      if (imageUrl) {
        const urlParts = imageUrl.split('/');
        const imageFilename = urlParts[urlParts.length - 1];

        if (imageFilename && imageFilename.endsWith('.png')) {
          await deleteImage(imageFilename, content.frontmatter.cf_image_id, collection).catch(err =>
            console.error('[Delete] Failed to delete R2 image:', err)
          );
        }
      }

      // Delete from Cloudflare Images if ID exists
      if (content.frontmatter.cf_image_id) {
        await deleteFromCloudflareImages(content.frontmatter.cf_image_id).catch(err =>
          console.error('[Delete] Failed to delete CF Image:', err)
        );
      }
    }

    deleteContent(filepath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// PROMPT ENDPOINTS
// ============================================================================

app.get('/api/prompts', async (req, res) => {
  try {
    const prompts = listAllPrompts();
    const withConfigs = await Promise.all(
      prompts.map(async p => ({
        ...p,
        config: loadPrompt(p.category, p.collection)
      }))
    );
    res.json(withConfigs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/prompts/:category/:collection', async (req, res) => {
  try {
    const { category, collection } = req.params;
    const config = loadPrompt(category, collection);
    if (!config) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/prompts/:category/:collection', async (req, res) => {
  try {
    const { category, collection } = req.params;
    const config = req.body;

    savePrompt(category, collection, config);
    const updated = loadPrompt(category, collection);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// GENERATION ENDPOINTS
// ============================================================================

app.post('/api/generate/:category/:collection', async (req, res) => {
  try {
    if (isGenerating) {
      return res.status(400).json({ error: 'Generation already in progress' });
    }

    const { category, collection } = req.params;
    const { count } = req.body;

    isGenerating = true;
    res.json({ message: `Started generating images for ${category}/${collection}` });

    // Run generation asynchronously
    generateBatch(category, collection, count)
      .then(() => {
        isGenerating = false;
        console.log(`[Dashboard] Generation finished for ${category}/${collection}`);
      })
      .catch(error => {
        isGenerating = false;
        console.error('[Dashboard] Generation failed:', error);
      });
  } catch (error) {
    isGenerating = false;
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/generate/status', async (req, res) => {
  res.json({ generating: isGenerating });
});

// Keep backward compatibility with old endpoint
app.post('/api/generate/:category', async (req, res) => {
  try {
    if (isGenerating) {
      return res.status(400).json({ error: 'Generation already in progress' });
    }

    const { category } = req.params;
    const collection = 'cats'; // Legacy: assume cats collection

    isGenerating = true;
    res.json({ message: `Started generating 5 ${collection} images.` });

    generateBatch(category, collection, 5)
      .then(() => {
        isGenerating = false;
        console.log('[Dashboard] Generation finished via legacy endpoint');
      })
      .catch(error => {
        isGenerating = false;
        console.error('[Dashboard] Generation failed:', error);
      });
  } catch (error) {
    isGenerating = false;
    res.status(500).json({ error: (error as Error).message });
  }
});

// Old approve/reject endpoints for backward compatibility
app.post('/api/approve', async (req, res) => {
  try {
    const { filename } = req.body;
    // Try to find the file in cats collection (legacy)
    const contentDir = path.resolve(__dirname, '../../../content');
    const filePath = path.join(contentDir, 'animals', 'cats', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    approveContent(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/reject', async (req, res) => {
  try {
    const { filename } = req.body;
    const contentDir = path.resolve(__dirname, '../../../content');
    const filePath = path.join(contentDir, 'animals', 'cats', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = getContent('animals', 'cats', filename);
    if (content) {
      const imageUrl = content.frontmatter.r2_original || content.frontmatter.image_url;
      if (imageUrl) {
        const urlParts = imageUrl.split('/');
        const imageFilename = urlParts[urlParts.length - 1];

        if (imageFilename && imageFilename.endsWith('.png')) {
          await deleteImage(imageFilename, content.frontmatter.cf_image_id, 'cats').catch(err =>
            console.error('[Reject] Failed to delete R2 image:', err)
          );
        }
      }

      if (content.frontmatter.cf_image_id) {
        await deleteFromCloudflareImages(content.frontmatter.cf_image_id).catch(err =>
          console.error('[Reject] Failed to delete CF Image:', err)
        );
      }
    }

    deleteContent(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Legacy drafts endpoint
app.get('/api/drafts', async (req, res) => {
  try {
    const drafts = listContent('animals', 'cats', true);
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(ENV.PATHS.DASHBOARD_PORT, () => {
  console.log(`🎨 Content CMS running at http://localhost:${ENV.PATHS.DASHBOARD_PORT}`);
});
