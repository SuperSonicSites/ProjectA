# 🛠️ Implementation: Cache Busting & Headers

### 1. Update `package.json`
**Goal:** Change the CSS output directory from `static` (copied as-is) to `assets` (processed by Hugo).

* **File:** `package.json`
* **Action:** Locate the `"build:css"` script and change the output flag `-o`.

```jsonc
// Current
"build:css": "tailwindcss -i ./themes/visual-sanctuary-theme/assets/css/main.css -o ./static/css/main.css --minify",

// Updated (Change ./static/ to ./assets/)
"build:css": "tailwindcss -i ./themes/visual-sanctuary-theme/assets/css/main.css -o ./assets/css/main.css --minify",

// Ensure Hugo always sees the generated CSS before it fingerprints:
"build": "npm run build:css && hugo"

```

---

### 2. Update `head.html`

**Goal:** Use Hugo's asset pipeline to fingerprint the CSS file, ensuring the filename changes whenever the content changes.

* **File:** `themes/visual-sanctuary-theme/layouts/partials/head.html`
* **Action:** Replace the static CSS link with the following logic.

**Remove:**

```html
<link rel="stylesheet" href="/css/main.css">

```

**Add:**

```html
{{ $styles := resources.Get "css/main.css" | fingerprint }}
<link rel="stylesheet" href="{{ $styles.RelPermalink }}" integrity="{{ $styles.Data.Integrity }}">

```

---

### 3. Create `static/_headers`

**Goal:** Tell Cloudflare to cache fingerprinted CSS "forever" (1 year) since its filename is unique to its content, while using shorter TTLs for non-fingerprinted assets to prevent staleness.

* **File:** Create new file `static/_headers`
* **Content:**

```text
# Cache fingerprinted CSS for 1 year (immutable)
/css/*
  Cache-Control: public, max-age=31536000, immutable

# Cache non-fingerprinted assets conservatively to avoid staleness
/fonts/*
  Cache-Control: public, max-age=604800
/images/*
  Cache-Control: public, max-age=604800

# Default cache for HTML pages (ensure fresh content)
/*
  Cache-Control: public, max-age=0, must-revalidate

```

*If you fingerprint fonts/images too (recommended), switch them to the 1-year immutable policy above and point the paths at the hashed locations (e.g., `/fonts/` → `/assets/fonts/` if that's where Hugo emits them).*

---

### 4. Clean & Verify

**Goal:** Ensure no old files confuse the build.

1. **Delete** the folder `static/css/` (it is no longer used).
2. **Run** `npm run clean` (to remove `public/`).
3. **Run** `npm run build` locally (this now runs `npm run build:css` → `assets/css/main.css` first, then `hugo` processes it and outputs the fingerprinted file).
4. **Check** `public/css/`: You should see a file like `main.h38s9...css` (the hash matches the file content).
5. **Verify** `static/_headers` is present in the root (Cloudflare Pages will pick it up during deployment).
