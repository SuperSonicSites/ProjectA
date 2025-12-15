# Morning Routine Backend - Testing Guide

## Issues Fixed

### 1. Missing TypeScript Type Definitions
**Problem:** TypeScript compiler couldn't find type definitions for `express` and `cors`.

**Solution:** Installed missing packages:
```bash
npm install --save-dev @types/express @types/cors
```

### 2. Glob Module API Change
**Problem:** Glob v13 changed its API. The old `glob.sync()` method is no longer available on the default import.

**Solution:** Updated import in `server.ts`:
```typescript
// Before
import glob from 'glob';
const files = glob.sync(path);

// After
import { globSync } from 'glob';
const files = globSync(path);
```

### 3. Windows Path Compatibility with Glob
**Problem:** `path.join()` creates Windows-style backslashes (`\`), but glob requires forward slashes (`/`).

**Solution:** Normalize paths for glob in `server.ts`:
```typescript
const searchPath = path.join(ENV.PATHS.CONTENT_DIR, '*.md').replace(/\\/g, '/');
const files = globSync(searchPath);
```

### 4. HTML Image Field Mismatch
**Problem:** Dashboard HTML was looking for `draft.frontmatter.image`, but markdown files use `image_url`.

**Solution:** Updated `index.html`:
```html
<!-- Before -->
<img :src="draft.frontmatter.image" ...>

<!-- After -->
<img :src="draft.frontmatter.image_url" ...>
```

## How to Test the Backend

### 1. Setup Secrets (First Time)
See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for detailed instructions.

Quick setup:
```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API keys
```

### 2. Start the Dashboard
```bash
npm run dashboard
```

This runs via Wrangler with secrets automatically injected. The server will start on `http://localhost:3000`

### 3. Test API Endpoints

#### List Drafts
```bash
curl http://localhost:3000/api/drafts
```
Expected: JSON array of draft files with `draft: true` in frontmatter.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/drafts
```

#### Generate Images
```bash
curl -X POST http://localhost:3000/api/generate/cats
```
Expected: `{"message": "Started generating 5 cats images."}`

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/generate/cats -Method Post
```

#### Approve a Draft
```bash
curl -X POST http://localhost:3000/api/approve \
  -H "Content-Type: application/json" \
  -d '{"filename": "cat-1765764823831-0.md"}'
```
Expected: `{"success": true}` and draft status changes to `false` in the markdown file.

**PowerShell:**
```powershell
$body = @{ filename = 'cat-1765764823831-0.md' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/approve -Method Post -Body $body -ContentType 'application/json'
```

#### Reject a Draft
```bash
curl -X POST http://localhost:3000/api/reject \
  -H "Content-Type: application/json" \
  -d '{"filename": "cat-1765764823831-0.md"}'
```
Expected: `{"success": true}` and the markdown file is deleted.

**PowerShell:**
```powershell
$body = @{ filename = 'cat-1765764823831-0.md' } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/api/reject -Method Post -Body $body -ContentType 'application/json'
```

### 4. Test the Web Dashboard

1. Open browser to `http://localhost:3000`
2. You should see the dashboard with any existing drafts
3. Click "Generate 5 Cats" to trigger batch generation
4. Click "Approve ✅" to approve a draft (removes draft flag)
5. Click "Reject ❌" to delete a draft and its assets

### 5. Test Batch Generation (CLI)

```bash
npm run generate:batch
```

This generates 5 cat coloring pages:
- Calls Gemini API to generate images
- Uploads to R2 and Cloudflare Images
- Creates markdown files in `content/animals/cats/` with `draft: true`

## Current Status

✅ **Dashboard Server**: Running successfully on port 3000
✅ **API Endpoints**: All 4 endpoints working (list, generate, approve, reject)
✅ **Web UI**: Dashboard displays drafts correctly
✅ **Image Display**: Fixed to use `image_url` field
✅ **Path Handling**: Windows paths work correctly with glob

## Dependencies Verification

Required packages installed:
- `express` (runtime)
- `cors` (runtime)
- `glob` v13 (runtime)
- `@types/express` (dev)
- `@types/cors` (dev)

## Environment Requirements

Ensure your `.dev.vars` file has:
```env
GEMINI_API_KEY=your_key_here
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
CF_IMAGES_ACCOUNT_ID=your_account_id
CF_IMAGES_API_TOKEN=your_token
CF_IMAGES_ACCOUNT_HASH=your_hash
DASHBOARD_PORT=3000
```

**Note:** Copy `.dev.vars.example` to `.dev.vars` and fill in your real API keys. This file is gitignored and won't be committed.

See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for detailed setup instructions.

## Notes

- Scripts run via Wrangler which automatically injects secrets from `.dev.vars` or Cloudflare
- The dashboard polls for new drafts every 5 seconds when generating
- Generation happens asynchronously (doesn't block the API response)
- Rejected drafts trigger deletion of both the markdown file and R2 images
- All API endpoints have error handling that returns 500 status codes with error messages

## Running Without Wrangler

If you need to run scripts directly (not recommended for production):

```bash
# Make sure you have .dev.vars or set environment variables manually
npm run dashboard:direct
npm run generate:direct
```

These `:direct` variants bypass Wrangler but require manual environment variable management.

