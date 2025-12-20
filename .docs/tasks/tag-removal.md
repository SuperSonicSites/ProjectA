# Project: Tag Zero Implementation Plan

This project outlines the steps to completely remove tags and tag generation from the PaperPause application. This involves changes to configuration, automation scripts, frontend templates, and a migration script to clean up existing content.

## Discovery Notes (Current Repo State)

- Hosting is **Cloudflare Pages** (see `wrangler.toml`) and the repo already uses `static/_redirects` for 301s. This is the safest place to prevent breaking changes when removing `/tags/*`.
- `hugo.toml` currently enables tags (`tag = "tags"`) and also uses `tags` in `[related]` indices.
- `scripts/morning-routine/tasks/generate-batch.ts` currently injects `tags:` into newly generated frontmatter (it uses the style name as a tag).
- The theme still outputs tag metadata in:
  - `themes/visual-sanctuary-theme/layouts/partials/seo/schema.html` (JSON-LD keywords)
  - `themes/visual-sanctuary-theme/layouts/_default/single.md` (Markdown endpoint shows “Keywords (tags)”)
- Archetypes already have **no `tags` field** (`archetypes/coloring-pages.md` and `archetypes/default.md`), so the archetype step is currently verification-only.
- Many existing content files contain a `tags:` block in frontmatter.

## Phase 0: Non‑Breaking Redirects (DO THIS FIRST)

### 0.1 Add 301 redirects for all `/tags/*` endpoints we are taking down
**File:** `static/_redirects`

**Why:** Removing the tags taxonomy removes:
- `/tags/` (taxonomy list page)
- `/tags/<term>/` (term pages)
- and their non-HTML outputs (because `hugo.toml` currently enables `taxonomy`/`term` outputs: HTML + RSS + MARKDOWN)

**Most appropriate redirect targets available today:**
- **Browse fallback**: `/categories/` (closest remaining taxonomy browse page)
- **Markdown browse fallback**: `/categories/index.md`
- **RSS fallback**: `/categories/index.xml` (only if categories RSS remains enabled; otherwise redirect to `/categories/`)

**Add these redirects (keep long-term to preserve SEO and backlinks):**
```text
# Tags taxonomy removal (HTML)
/tags /categories/ 301
/tags/ /categories/ 301
/tags/* /categories/ 301

# Tags taxonomy removal (Markdown endpoints)
/tags/index.md /categories/index.md 301
/tags/*/index.md /categories/index.md 301

# Tags taxonomy removal (RSS)
/tags/index.xml /categories/index.xml 301
/tags/*/index.xml /categories/index.xml 301
```

**Notes (avoid breaking changes at all cost):**
- Ensure these are **single-hop** (no chains/loops).
- If you later decide categories RSS should not exist, change the two `*.xml` targets to `/categories/` instead of removing redirects.

## Phase 1: Configuration & Templates

### 1.1 Update Hugo Configuration
**File:** `hugo.toml`

**Action:** Disable the tag taxonomy and remove it from the "Related Content" configuration. Adjust weights to prioritize `categories` and `style`.

**Changes:**
```toml
# Find and Update [taxonomies]
[taxonomies]
  category = "categories"
  # REMOVED: tag = "tags"

# Find and Update [related]
[related]
  includeNewer = true
  threshold = 80
  toLower = false

  [[related.indices]]
    name = "categories"
    weight = 100  # INCREASED: Was 80

  # REMOVED: [[related.indices]] block for "tags"

  [[related.indices]]
    name = "difficulty"
    weight = 30
  
  [[related.indices]]
    name = "style"
    weight = 50  # INCREASED: Was 20

### 1.2 Update Content Archetypes
File: archetypes/coloring-pages.md

Action: Verify the default templates for new manual content do not include a `tags` field.

Changes:

Locate the frontmatter block.

If a `tags` key exists, remove it. (Current repo state: no `tags` key exists in archetypes, so no change is required.)

## Phase 2: Automation Logic
### 2.1 Update Generation Script
File: scripts/morning-routine/tasks/generate-batch.ts

Action: Stop the automated generation script from injecting the style name as a tag into new Markdown files.

Changes: Find the const mdContent template string and remove the tags section.

// ... inside generateBatch function ...

        const mdContent = `---
title: "${title}"
description: "${seoDescription}"
pinterest_description: "${pinterestDescription}"
date: ${new Date().toISOString()}
type: "${template.type || 'coloring-pages'}"
draft: false
categories:
  - ${category}
style: "${style.name}"
medium: "${medium}"
audience: "${audience}"
cf_image_id: "${uploadResult.cfImageId}"
image_url: "${uploadResult.imageUrl}"
download_url: "${uploadResult.downloadUrl}"
r2_original: "${uploadResult.r2Url}"
prompt: "${variantPrompt}"
## REMOVE:
## tags:
##   - ${style.name}
---

A beautiful ${collection} coloring page in ${style.name} style.
// ...

## Phase 3: Frontend & SEO Cleanup

### 3.1 Clean Schema.org Output
File: themes/visual-sanctuary-theme/layouts/partials/seo/schema.html

Action: Remove tags from the schema keywords list to prevent search engines from indexing tag pages.

Changes:

1. Find the keyword generation block for collection pages and remove the loop over pages:
{{/* Build keywords from categories and common tags */}}
    {{ $keywords := slice }}
    {{ if .Params.categories }}{{ $keywords = $keywords | append .Params.categories }}{{ end }}
    
    {{/* DELETED: Loop that appended .Params.tags */}}
    
    {{ $keywords = $keywords | uniq | first 10 }}

2. Find the VisualArtwork schema section and remove the tag append logic:
{{ $keywords := slice }}
      {{ if .Params.categories }}{{ $keywords = $keywords | append .Params.categories }}{{ end }}
      {{/* DELETED: {{ if .Params.tags }}{{ $keywords = $keywords | append .Params.tags }}{{ end }} */}}
      {{ if gt (len $keywords) 0 }}
      ,"keywords": "{{ delimit $keywords ", " }}"
      {{ end }}

### 3.2 Remove tags from AI-friendly Markdown endpoints
File: themes/visual-sanctuary-theme/layouts/_default/single.md

Action: Remove the block that prints:
`Keywords (tags): ...`

### 3.2 Update LLM Discovery
File: static/llms.txt

Action: Remove the reference to the tags endpoint so AI agents do not try to crawl missing tag pages.

Changes:
### Taxonomies

- [https://paperpause.app/categories/index.md](https://paperpause.app/categories/index.md) — All categories
# DELETED: - [https://paperpause.app/tags/index.md](https://paperpause.app/tags/index.md) — All content tags

Also update any prose that claims the Markdown endpoints include “tags” in the metadata block.

Phase 4: Content Migration (Cleanup Existing Files)
4.1 Create Cleanup Script
File: scripts/morning-routine/tasks/cleanup-tags.ts

Action: Create a migration script to iterate through all existing Markdown files and strip the tags field from their frontmatter.

Important (avoid breaking changes): the `gray-matter` approach below may re-serialize YAML and cause noisy diffs (dates/quotes/folding/key order). Prefer a **surgical frontmatter edit** that removes only the `tags` key/block inside the top `--- ... ---` frontmatter without rewriting other fields.

Code:
import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { globSync } from 'glob';
import { logger } from '../lib/logger';

const CONTENT_DIR = path.resolve(__dirname, '../../../content');

async function removeTags() {
  logger.info('Starting tag cleanup across all content...');
  
  const files = globSync(path.join(CONTENT_DIR, '**/*.md').replace(/\\/g, '/'));
  let modified = 0;

  for (const file of files) {
    if (path.basename(file) === '_index.md') continue;

    try {
      const content = await fs.readFile(file, 'utf8');
      const parsed = matter(content);

      if (parsed.data.tags) {
        delete parsed.data.tags;
        const newContent = matter.stringify(parsed.content, parsed.data);
        await fs.writeFile(file, newContent);
        modified++;
      }
    } catch (error) {
      logger.error(`Error processing ${file}`, error as Error);
    }
  }

  logger.success(`Cleanup complete. Removed tags from ${modified} files.`);
}

if (require.main === module) {
  removeTags().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

### 4.2 Execute Cleanup
Run the migration:
npx ts-node scripts/morning-routine/tasks/cleanup-tags.ts

## Phase 5: Verification
Validate Taxonomy: Run npx ts-node scripts/validate-taxonomy.ts to ensure the structure remains valid.

Check Local Build: Verify that paperpause.app/tags/ no longer exists and individual pages no longer show tag metadata.

Verify Redirects (critical):
- `/tags/` returns **301** → `/categories/`
- `/tags/<term>/` returns **301** → `/categories/`
- `/tags/index.md` returns **301** → `/categories/index.md`