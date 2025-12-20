# Role
You are a Senior Hugo Developer and Technical SEO Specialist focused on structured data.

# Context
PaperPause already signals licensing in the **image sitemap** using `https://paperpause.app/terms/`, but the JSON-LD schema currently claims a Creative Commons license URL.

This mismatch weakens “authority alignment” signals and can create ambiguity for crawlers and downstream data consumers.

# Objective
Align structured data licensing by updating the single-page JSON-LD (`VisualArtwork`) license URL to:
- `https://paperpause.app/terms/`

# Constraints (CRITICAL)
1. **Theme-First Architecture**: Per `.ai-rules.md`, edit layouts only in `themes/visual-sanctuary-theme/layouts/`.
2. **Schema Validity**: The JSON-LD must remain valid JSON after templating (commas/quoting must stay correct).

# Implementation Plan

## Step 1: Locate the schema license field
**Target file:** `themes/visual-sanctuary-theme/layouts/partials/seo/schema.html`

In the “Single Asset Schema (ImageObject + VisualArtwork)” section, find the `VisualArtwork` block. It currently contains:
- `"license": "https://creativecommons.org/licenses/by-nc-nd/4.0/"`

## Step 2: Update the license URL
Change the license value to:
- `"license": "https://paperpause.app/terms/"`

Keep the field location and JSON formatting identical (only update the string) to reduce risk.

## Step 3: Verify end-to-end
Run and verify:
- `npm run dev`
  - Open any single coloring page.
  - View page source and confirm the JSON-LD now includes `"license": "https://paperpause.app/terms/"`.
- `npm run build` to ensure Hugo can render the schema template across the whole site.

Optional external validation (recommended):
- Test a single URL in Google’s Rich Results Test and confirm the JSON-LD parses successfully.

# Acceptance Criteria
- The JSON-LD `VisualArtwork.license` equals **`https://paperpause.app/terms/`** on single pages.
- No JSON syntax regressions (schema still parses; site builds cleanly).
- No changes are made in root `layouts/` (theme remains the source of truth).


