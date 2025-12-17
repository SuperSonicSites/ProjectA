# AI Agents

This directory contains autonomous AI agents that enhance content quality in the ProjectA pipeline.

## Available Agents

### SEO Copywriter (`seo-copywriter/`)

**Purpose**: Vision-based metadata optimization for coloring page content.

**What it does:**
- Analyzes the actual generated image using Gemini vision
- Generates 5 optimized fields:
  - `title` - On-site page title (50 chars max)
  - `description` - Google meta description (150-160 chars)
  - `pinterest_title` - Pinterest/RSS title (65 chars max)
  - `pinterest_description` - Pinterest SEO description (200-300 chars)
  - `prompt` - Alt text for accessibility (150 chars max)

**How to run (dry-run):**
```bash
npx ts-node scripts/morning-routine/tasks/seo-review-one.ts <category> <collection> <filename.md>

# Example:
npx ts-node scripts/morning-routine/tasks/seo-review-one.ts animals Butterflies cottagecore-butterflies-coloring-pages-7744.md
```

**Safety:**
- The agent uses `gray-matter` merge strategy
- Only the 5 SEO fields are updated
- All other frontmatter fields (`cf_image_id`, `image_url`, `download_url`, `r2_original`, etc.) remain **completely untouched**
- Body content is preserved exactly
- This is **deterministic** - same input = same output

**Model:** `gemini-2.5-flash` (vision-capable)

**Configuration:** Uses `GEMINI_API_KEY` from `.dev.vars`

## Integration Status

- ✅ **SEO Copywriter**: v1 complete, dry-run only
- ⏳ **Pipeline Integration**: Planned for v2
- ⏳ **Batch Processing**: Planned for v2

## Adding New Agents

1. Create a new folder under `.agents/<agent-name>/`
2. Add:
   - `spec.md` - Prompt specification
   - `types.ts` - TypeScript interfaces
   - `index.ts` - Main entrypoint with `export async function run(...)`
3. Create a test script in `scripts/morning-routine/tasks/`
4. Update this README

## Architecture Notes

- Agents are **model-agnostic** - wrap any AI provider
- Agents return structured output (JSON/TypeScript types)
- Validation and normalization happen in the agent, not the caller
- Retry logic is built into each agent
- Agents should be **idempotent** when possible

