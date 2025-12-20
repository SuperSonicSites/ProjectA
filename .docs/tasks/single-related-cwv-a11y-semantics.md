# Role
You are a Senior Hugo Developer focused on Core Web Vitals, accessibility, and semantic HTML.

# Context
On single pages, the “You might also like…” related grid currently renders images without:
- `alt` text (a11y + contextual internal linking)
- `width` / `height` (layout stability; reduces CLS risk)
- `loading="lazy"` (unnecessary early loading for below-the-fold content)

Additionally, the heading hierarchy currently jumps from the related section `h2` to related card titles as `h4`, which can confuse strict outline parsers and some assistive tooling.

# Objective
Improve single-page CWV and accessibility by updating the related grid so that:
- Related images are **lazy-loaded**, **dimensioned**, and **described**
- Related card headings follow a logical hierarchy (`h2` → `h3`)

# Constraints (CRITICAL)
1. **Theme-First Architecture**: Per `.ai-rules.md`, edit only in `themes/visual-sanctuary-theme/layouts/`.
2. **Don’t Break Missing Data**: Some related pages may not have `image_url`; the layout must still render cleanly.
3. **Keep Existing Visual Layout**: Preserve the current grid/aspect ratio styling.

# Implementation Plan

## Step 1: Locate the related grid block
**Target file:** `themes/visual-sanctuary-theme/layouts/_default/single.html`

Find the “Related Grid” section near the bottom:
- The section heading is `You might also like...` (currently `h2`)
- The cards are created inside `{{ range $related }}`.

## Step 2: Fix heading hierarchy
Change each related card title from `h4` to `h3` so the outline becomes:
- `h1`: page title
- `h2`: “You might also like…”
- `h3`: each related item title

## Step 3: Optimize the related `<img>` element
Update the image tag inside the related-card loop:

- Add `alt` text:
  - Suggested: `alt="Coloring page of {{ .Title }}"`.
- Add `loading="lazy"` (below the fold).
- Add `decoding="async"` (faster paint scheduling).
- Add `width` and `height` to reserve layout space:
  - Suggested placeholder dimensions matching your 3:4 aspect: `width="300"` and `height="400"`.
- Keep existing classes to maintain the current crop behavior:
  - `class="w-full h-full object-cover"`

Important template detail:
- Inside `{{ range $related }}`, `.` refers to the related page, so `{{ .Title }}` and `{{ .Params.image_url }}` correctly apply to the related item.

## Step 4: Preserve graceful fallback when `image_url` is missing
If a related item lacks `.Params.image_url`, continue to render the card with the existing placeholder container (`aspect-[3/4] …`) and simply omit the `<img>`.

Optional enhancement (only if you want to go further later):
- If related items have `.Params.cf_image_id`, consider constructing a Cloudflare delivery URL variant (e.g., `thumbnail`) to serve smaller images in the grid.

## Step 5: Verify via local build + quick CWV sanity
Run and verify:
- `npm run dev`
  - Confirm related images now have `alt`, `loading="lazy"`, and `width/height` in the HTML.
  - Confirm no layout jump occurs as images load (reduced CLS).
  - Confirm headings are now `h3` for the related titles.
- `npm run build` (ensures templates compile).

# Acceptance Criteria
- Related images include **alt**, **loading="lazy"**, and **width/height**.
- Related grid still renders correctly when a related page has no `image_url`.
- Heading hierarchy is corrected (`h2` → `h3`), removing the `h2` → `h4` jump.
- All changes live in `themes/visual-sanctuary-theme/layouts/_default/single.html` (no root layout shadowing).


