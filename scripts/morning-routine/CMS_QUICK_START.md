# Content CMS - Quick Start Guide

> **📚 Documentation:** For detailed secrets setup, see [SECRETS_SETUP.md](./SECRETS_SETUP.md)

## 🚀 Getting Started

### 1. Setup Secrets (First Time Only)

Quick setup:
```bash
# Copy the example template
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your real API keys
# See SECRETS_SETUP.md for where to get API keys
```

### 2. Start the CMS
```bash
npm run dashboard
```

This runs the dashboard with secrets from `.dev.vars` automatically loaded.

Then visit: **http://localhost:3000**

## 📋 The Three Tabs

### ➕ CREATE TAB
Manage your content structure and generate new images.

**Creating a New Category:**
1. Click "+ New Category"
2. Enter category name (e.g., "nature", "objects")
3. Add title and description
4. Click "Create"

**Creating a New Collection:**
1. Click "+ New Collection"
2. Select parent category
3. Enter collection name (e.g., "roses", "sunset")
4. Fill in metadata (title, description, image URL)
5. Configure generation settings:
   - Batch size (default 5)
   - Difficulty level
   - Style
   - Medium (pencils, markers, etc.)
6. Click "Create"

**Generating Images:**
1. Select a category to see its collections
2. Click "🚀 Generate" on any collection card
3. Choose number of images to generate
4. Click "Generate" and wait 1-2 minutes per image
5. Images appear as DRAFT items in Edit tab

### ✏️ EDIT TAB
Review, edit, and publish generated content.

**Editing Content:**
1. Use filters to find content (Category → Collection → Status)
2. Click a content card to edit
3. Modify:
   - Title
   - Description
   - Difficulty / Style / Medium
   - Image URL
   - Prompt/Notes
   - Draft status
4. Click "💾 Save Changes"

**Publishing Content:**
1. If content is DRAFT, click "✅ Approve (Publish)"
2. This removes draft status and makes it live
3. Published content appears in your Hugo site

**Deleting Content:**
1. Click "🗑️ Delete" in the edit modal
2. Content and images are removed
3. Cannot be undone!

### 💬 PROMPTS TAB
Fine-tune the generation prompts for each collection.

**Editing a Collection's Prompt:**
1. Select a collection from the dropdown
2. Edit the base prompt (what to generate)
3. Edit negative prompt (what to avoid)
4. Manage attributes:
   - **Tones**: Mood/atmosphere (Cozy, Playful, etc.)
   - **Types**: Subject variety (Persian Cat, Tabby, etc.)
   - **Actions**: What the subject is doing
   - **Settings**: Where the scene takes place
   - **Details**: Special elements in the composition
5. Add/remove items from attribute lists
6. Click "💾 Save Changes"

**Testing Changes:**
1. Make changes to prompt
2. Click "🧪 Test Generate (1 image)"
3. Check draft to see result
4. Refine and save improvements

## 📁 File Structure

Your content is organized like this:

```
content/
├── animals/              (← Category)
│   ├── _index.md        (← Category metadata)
│   ├── cats/            (← Collection)
│   │   ├── _index.md    (← Collection metadata + CMS settings)
│   │   └── cat-*.md     (← Generated content)
│   └── dogs/
│       ├── _index.md
│       └── dog-*.md
└── nature/
    ├── _index.md
    └── flowers/
        ├── _index.md
        └── flower-*.md
```

## 🔧 Advanced Usage

### CLI Generation
Generate images from command line:

```bash
ts-node scripts/morning-routine/tasks/generate-batch.ts animals cats 5
```

Format: `<category> <collection> [count]`

### Modify Collection Settings
Edit collection metadata directly:

1. Edit tab → Select collection → Content card
2. OR Edit `/content/{category}/{collection}/_index.md`
3. Change these fields:
   - `cms_batch_size`: Images per generation
   - `cms_frontmatter_template`: Default metadata for generated content

### Environment Variables Setup

This project uses **`.dev.vars`** for local secret management.

Create a `.dev.vars` file from the template:
```bash
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars` and fill in your API keys:
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

The `.dev.vars` file is automatically loaded when you run `npm run dashboard` or `npm run generate`.

**For Cloudflare Pages Production:**

Set secrets using Wrangler:
```bash
wrangler pages secret put GEMINI_API_KEY
wrangler pages secret put R2_ACCESS_KEY_ID
# ... etc for all secrets
```

**Why .dev.vars?** 
- ✅ Simple and straightforward for local development
- ✅ `.dev.vars` is gitignored to prevent accidental commits
- ✅ Cloudflare's standard format for local secrets
- ✅ Separate from production secrets

## 💡 Pro Tips

1. **Auto-refresh**: UI updates every 10-15 seconds automatically
2. **Batch Generation**: Start generation, close browser, images generate in background
3. **Prompt Variants**: Use attributes to create variety with the same base prompt
4. **Easy Publishing**: Approve drafts with one click to publish to your site
5. **Safe Deletion**: Always get confirmation before deleting content

## 🎯 Common Workflows

### Workflow 1: Generate and Publish
1. Create tab → Select collection → Generate 5 images
2. Wait for generation
3. Edit tab → Review drafts
4. Edit frontmatter if needed
5. Click "Approve" to publish
6. Repeat with next batch

### Workflow 2: Refine Prompts
1. Prompts tab → Select collection
2. Adjust base prompt and attributes
3. Test Generation (1 image)
4. Review result in Edit tab
5. Repeat until happy with style
6. Save final prompt

### Workflow 3: Create New Collection
1. Create tab → "+ New Collection"
2. Fill in all metadata
3. System auto-creates default prompt
4. Prompts tab → Refine the prompt
5. Generate first batch
6. Edit and publish content

## ❓ FAQ

**Q: How long does generation take?**
A: ~1-2 minutes per image depending on API load

**Q: Can I have multiple collections in one category?**
A: Yes! Create as many as you want

**Q: What if generation fails?**
A: Check that .dev.vars file exists with all required keys. Try generating fewer images. Check logs for specific errors.

**Q: Can I edit HTML or markdown content directly?**
A: Edit frontmatter in CMS. Raw markdown editing coming later.

**Q: How do I delete a category?**
A: It must be empty (no collections) first

**Q: What's the difference between Draft and Published?**
A: Drafts don't show on your Hugo site. Publish when ready.

## 🔐 Security & Secrets Setup

This project uses **`.dev.vars`** to manage API keys and secrets for local development.

### First Time Setup

**1. Create a `.dev.vars` file:**
```bash
cp .dev.vars.example .dev.vars
```

**2. Fill in your API keys in `.dev.vars`:**

Get your keys from:
- **GEMINI_API_KEY**: https://makersuite.google.com/app/apikey
- **R2 Credentials**: Cloudflare Dashboard > R2 > Manage R2 API Tokens
- **CF Images**: Cloudflare Dashboard > Images > API Tokens

**3. Test that it works:**
```bash
npm run dashboard
# Should start without warnings about missing keys
```

### How It Works

- Scripts automatically load `.dev.vars` via `dotenv-cli`
- Environment variables are injected into `process.env`
- `.dev.vars` is gitignored and will **never** be committed to Git
- For production, use `wrangler pages secret put` to set secrets in Cloudflare

### Migrating from Old .env Files

If you previously used `.env`:

**1. Rename it:**
```bash
mv .env .dev.vars
```

**2. If secrets were committed to Git:**
```bash
# IMPORTANT: Rotate all exposed API keys immediately!
# - Gemini: https://makersuite.google.com/app/apikey
# - Cloudflare: Dashboard > R2 > Manage R2 API Tokens
# - Cloudflare Images: Dashboard > Images > API Tokens

# Then clean up Git history (optional but recommended)
# Use git-filter-repo or BFG Repo-Cleaner to remove sensitive history
```

**3. Delete old files:**
```bash
rm -f .env .env.local .env.development
```

## 🆘 Troubleshooting

**CMS won't start:**
```bash
# Check port 3000 is available
# Try different port: DASHBOARD_PORT=3001 npm run dashboard
```

**Generation fails:**
```bash
# Check .dev.vars file exists with all required keys
# Verify API keys are valid and not expired
# Try generating 1 image instead of 5
# Check console logs for specific error messages
```

**Images not uploading:**
```bash
# Check R2 and Cloudflare credentials
# Check bucket name and permissions
```

**UI looks broken:**
```bash
# Clear browser cache
# Try different browser
# Check console for errors (F12)
```

---

**Ready to create?** Go to http://localhost:3000 and start building! 🎨

