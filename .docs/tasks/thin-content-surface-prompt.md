# Role
You are a Senior Hugo Developer and Technical SEO Specialist.

# Context
PaperPause’s single pages are programmatic, and many rely on similar “generic” descriptions. This can increase “thin/duplicate content” risk.

Each page already has a unique frontmatter field, `prompt`, used to generate the image. The prompt contains rich long-tail entities/attributes (e.g., objects, materials, scene details) that are currently **not visible in the rendered HTML**, so users and search engines can’t benefit from it.

# Objective
Surface `.Params.prompt` on single pages as visible, crawlable HTML in a way that:
- Adds unique, page-specific text (thin-content mitigation)
- Doesn’t visually overwhelm the page
- Is safe (no HTML injection) and robust (no errors if missing)

# Constraints (CRITICAL)
1. **Theme-First Architecture**: Per `.ai-rules.md`, edit layouts only in `themes/visual-sanctuary-theme/layouts/`. Do not create/modify root `layouts/` overrides.
2. **Safety**: Treat `prompt` as untrusted text; escape/sanitize before outputting.
3. **Graceful Degradation**: If `prompt` is missing/empty, render nothing.

# Implementation Plan

## Step 1: Choose placement in `single.html`
**Target file:** `themes/visual-sanctuary-theme/layouts/_default/single.html`

Preferred placement is in the **RIGHT: Action Panel** (the sidebar content) so it is above the fold on desktop and near the primary content on mobile:
- After the description block (`{{ .Description }}`) and before the CTA/actions.

Rationale: the prompt is semantically “about the image” and should be close to the title/description.

## Step 2: Render the prompt safely and accessibly
Add a conditional block that only renders when present:
- Use `{{ with .Params.prompt }}` (preferred) or `{{ if .Params.prompt }}`.
- Output escaped text via `plainify` and/or `htmlEscape`:
  - Example strategy: `{{ . | plainify | htmlEscape }}`.

Recommended HTML shape:
- Use a `<section>` container with a small heading and muted styling (Tailwind utilities).
- Avoid introducing an inappropriate heading jump; inside the sidebar, a section heading like `h2` or `h3` is acceptable. (The page already has an `h1` for the title.)

## Step 3: Keep it “visible but lightweight”
Use a compact design so it’s clearly supplemental:
- Smaller text size
- Optional italic/quote styling
- Subtle background/border (consistent with existing Tailwind palette)

## Step 4: Verify output
Run and verify:
- `npm run dev` (local) and confirm:
  - Pages with a `prompt` show the new “Image details” block with the prompt text.
  - Pages without `prompt` do not show an empty box.
  - The prompt is present in the HTML source (view-source), not only client-side.
- `npm run build` to ensure Hugo build succeeds.

# Acceptance Criteria
- **Prompt is visible** on single pages when `prompt` exists.
- **No rendering** occurs when `prompt` is missing/empty (no blank headings/containers).
- **Prompt is escaped/sanitized** so it cannot inject markup into the page.
- **No layout overrides** are created in root `layouts/`; changes live in the theme.

# Notes / Nice-to-haves (Optional)
- If prompts are extremely long, consider truncation with a “Show more” (`<details>`) while still keeping some prompt text visible for SEO.


