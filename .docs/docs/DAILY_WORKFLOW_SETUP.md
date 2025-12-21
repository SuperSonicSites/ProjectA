# Daily Workflow Setup - Complete ✅

> Baseline doc: this describes the **current** GitHub Actions workflow.\n
> Autonomy vNext scheduling is defined in `mission-control/rollout-schedule.md` and the PRD in `.docs/prd/`.\n
> Foreman/Designer/QA/strict-JIT PDFs are part of the PRD rollout and may not be fully implemented yet.

## What Was Set Up

A fully automated GitHub Actions workflow that runs daily to generate and publish coloring page images.

## Files Created

1. **`.github/workflows/daily-generate-and-optimize.yml`**
   - Main GitHub Actions workflow file
   - Runs daily at 5:00 AM EST (10:00 AM UTC)
   - Can also be triggered manually

2. **`scripts/morning-routine/tasks/publish-drafts.ts`**
   - Script that sets `draft: false` on all generated images
   - Makes images go live automatically

## What the Workflow Does

The workflow runs **once daily** at 5:00 AM EST:

1. ✅ **Generates 5 images** - 1 per collection (cats, dogs, horses, butterflies, sharks) using **Gemini 3 Pro Image**.
2. ✅ **Optimizes SEO** - Automatically generates meta descriptions and titles using AI.
3. ✅ **Automatically publishes** - Images are set to `draft: false` and go live immediately.
4. ✅ **Commits changes** - Pushes to repository with timestamp.

**Total**: 5 images generated, optimized, and published per day.

**Important**: Images are automatically optimized and published.

## Next Steps

### 1. Add GitHub Secrets

You need to add these secrets to your GitHub repository:

**Go to**: Repository → Settings → Secrets and variables → Actions → New repository secret

**Required Secrets:**
- `GEMINI_API_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `CF_IMAGES_ACCOUNT_ID`
- `CF_IMAGES_API_TOKEN`
- `CF_IMAGES_ACCOUNT_HASH`

📝 **Tip**: Copy values from your `.dev.vars` file

### 2. Enable Workflow Permissions

**Go to**: Repository → Settings → Actions → General → Workflow permissions

✅ Select: **"Read and write permissions"**

This allows the workflow to commit and push changes.

### 3. Test the Workflow

#### Option A: Wait for Scheduled Run
- **5:00 AM EST (10:00 AM UTC)** - Both cats and dogs are generated automatically

#### Option B: Trigger Manually
1. Go to **Actions** tab
2. Select **"Daily Generate & Optimize Coloring Pages"**
3. Click **"Run workflow"**
4. Select branch
5. Click **"Run workflow"** (This will generate 1 image for each collection)

## Local Testing

You can test the scripts locally:

```bash
# Generate 1 cat image
npm run generate animals cats 1

# Generate 1 dog image  
npm run generate animals dogs 1

# Generate 1 horse image
npm run generate animals horses 1

# Generate 1 butterfly image
npm run generate animals butterflies 1

# Generate 1 shark image
npm run generate animals sharks 1

# Or generate multiple images
npm run generate animals cats 5

# Publish any remaining drafts (set draft: false)
npm run publish:drafts
```

## Publishing Images

### Automatic Publishing

Images are **automatically published** when generated:
- The `generate-batch.ts` script creates images with `draft: false`
- The workflow includes a safety step that ensures all drafts are published
- Images go live immediately after generation

### Manual Publishing (if needed)

If you need to publish existing draft images manually:

**Option 1: Use the publish script**
```bash
npm run publish:drafts
```
This will set `draft: false` on ALL draft images.

**Option 2: Manually edit files**
- Open the `.md` files in `content/animals/` subdirectories (cats, dogs, horses, butterflies, sharks)
- Change `draft: true` to `draft: false`
- Commit and push

## Customization

### Change Schedule

Edit `.github/workflows/daily-generate-and-optimize.yml`:

```yaml
schedule:
  # Both cats and dogs: 5:00 AM EST = 10:00 AM UTC
  - cron: '0 10 * * *'
```

**Time Zone Reference:**
- 5 AM EST = 10:00 AM UTC (during standard time)
- 5 AM EDT = 9:00 AM UTC (during daylight saving time)

**Other Schedule Examples:**
- `0 11 * * *` - 6 AM EST / 11 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1-5` - Weekdays at 9 AM UTC
- `0 0 * * *` - Daily at midnight UTC

### Change Number of Images

Edit the workflow file and change the count parameter in the `generate` step:

```yaml
- name: Generate ${{ matrix.collection }} (1 image)
  run: |
    # ...
    npx ts-node scripts/morning-routine/tasks/generate-batch.ts animals ${{ matrix.collection }} 5  # Change 1 to 5
```

This will generate 5 images per collection instead of 1.

### Add More Collections

To generate images for additional animal types:

1. Add new collection prompt files in `scripts/morning-routine/config/prompts/`
2. Add the new collection name to the `matrix.collection` array in `.github/workflows/daily-generate-and-optimize.yml`:

```yaml
strategy:
  matrix:
    collection: [cats, dogs, horses, butterflies, sharks, rabbits]
```

## Monitoring

### View Workflow Runs
- Go to **Actions** tab in GitHub
- View history of all runs
- Click any run to see detailed logs

### Check Generated Files
- New images appear in:
  - `content/animals/cats/`
  - `content/animals/dogs/`
  - `content/animals/horses/`
  - `content/animals/butterflies/`
  - `content/animals/sharks/`
- Each run creates a commit with timestamp

## Troubleshooting

### Workflow Not Running
- Check if workflow is enabled in Actions tab
- Verify cron schedule is correct
- Check workflow permissions are set

### Images Not Publishing
- Check if `draft: false` is being set in markdown files (should be automatic)
- Verify the `publish-drafts.ts` script step is running in workflow logs
- Review workflow logs for any errors during generation or publishing

### API Errors
- Check API keys are valid
- Verify rate limits haven't been exceeded
- Review R2 and Cloudflare Images quotas

## Support

For detailed setup instructions and logic, see:
- `scripts/morning-routine/tasks/generate-batch.ts` - Image generation logic
- `scripts/morning-routine/tasks/publish-drafts.ts` - Publishing logic
- `scripts/morning-routine/tasks/seo-review-batch.ts` - SEO optimization logic

---

**Status**: ✅ Optimized and Operational
**Last Updated**: December 18, 2025

