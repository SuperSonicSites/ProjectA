# Role
You are a Senior Hugo Developer and AI-SEO Architect.

# Context
We are upgrading "PaperPause" (a coloring pages site) to be an "AI-First" platform. We want to expose a parallel "Data Layer" specifically for AI agents (like Perplexity, SearchGPT) so they can ingest our content without parsing heavy HTML.

We will achieve this by implementing the `llms.txt` standard and utilizing Hugo's native Custom Output Formats to generate clean Markdown endpoints for every page and section.

# Objective
Implement a Markdown-based API for the entire site using Hugo's native tools.
1.  **Configuration:** Enable `.md` output generation.
2.  **Templates:** Create structured Markdown templates ("Data Cards") for pages and sections.
3.  **Discovery:** Make these files discoverable via `llms.txt` and HTML headers.

# Constraints (CRITICAL)
1.  **Theme-First Architecture:** As per `.ai-rules.md`, ALL new templates must be created in `themes/visual-sanctuary-theme/layouts/`. DO NOT create files in the project root `layouts/`.
2.  **Robustness:** Templates must handle missing frontmatter fields (like `difficulty`) gracefully without breaking.
3.  **Clean URLs:** We want endpoints like `/animals/cats/index.md`.

# Implementation Plan

## Step 1: Hugo Configuration
Update `hugo.toml` to define the Markdown media type and output format.
* **Media Type:** `text/markdown` with suffix `md`.
* **Output Format:** Name `MARKDOWN`, baseName `index`, isPlainText `true`.
* **Assignment:** Add "MARKDOWN" to `home`, `section`, `page`, `taxonomy`, and `term`.
* **Taxonomy:** Ensure both `category` and `tag` are enabled in `[taxonomies]`.

## Step 2: Create Markdown Templates
Create the following files in `themes/visual-sanctuary-theme/layouts/`.

### A. The "Data Card" (Single Page)
**File:** `_default/single.md`
**Logic:** Output a clean Markdown file with a comprehensive metadata block and the image.
**Content Strategy:**
-   **Metadata:** Title, Description, Canoncial HTML link, Style, Medium, Audience, Difficulty (handle if missing), Tags.
-   **Assets:** Download URL (PDF) and Source Image (R2/Cloudflare).
-   **Image:** Standard Markdown image embedding.
-   **Context:** Include `prompt` and `pinterest_description` if available.

### B. The "Section Index" (List Page)
**File:** `_default/list.md`
**Logic:** A recursive index for sections (e.g., `/animals/`).
**Content Strategy:**
-   List sub-collections (if any) with links to their `.md` versions.
-   List the first 200 pages in this section with links to their `.md` versions.
-   Include a brief summary (Title + Description) for each link.

### C. The "Home Index" (Homepage)
**File:** `index.md`
**Logic:** The root entry point.
**Content Strategy:**
-   Site Title & Description.
-   List of all Top-Level Sections (Collections) linking to their `.md` index.
-   Links to the XML Sitemaps.

## Step 3: Enable Discovery
**File:** `themes/visual-sanctuary-theme/layouts/partials/head.html`
**Task:** Add a `<link rel="alternate">` tag.
**Logic:** Only render this tag if the `MARKDOWN` output format is available for the current page. Point it to the Markdown permalink.

## Step 4: The Directory File
**File:** `static/llms.txt`
**Task:** Create a static file following the spec.
**Content:**
-   **Header:** Site Name & Summary.
-   **Core Content:** Hardcoded links to the key Markdown indexes (Home, Animals, Cats, Dogs, Butterflies, Horses, Sharks).
-   **Sitemaps:** Links to `sitemap.xml`.
-   **Notes:** Brief explanation of the Markdown structure for agents.

# Execution
Please write the code for these files. Ensure you use `with` blocks in Hugo to safely access params that might be undefined.