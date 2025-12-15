# Daily Workflow Setup - Complete ✅

## What Was Set Up

A fully automated GitHub Actions workflow that runs daily to generate and publish coloring page images.

## Files Created

1. **`.github/workflows/daily-image-generation.yml`**
   - Main GitHub Actions workflow file
   - Runs daily at 8:00 AM UTC
   - Can also be triggered manually

2. **`scripts/morning-routine/tasks/publish-drafts.ts`**
   - Script that sets `draft: false` on all generated images
   - Makes images go live automatically

3. **`.github/GITHUB_ACTIONS_SETUP.md`**
   - Detailed setup instructions
   - Lists all required GitHub secrets
   - Troubleshooting guide

## What the Workflow Does

The workflow runs **once daily** at 5:00 AM EST:

1. ✅ **Generates 5 cat images** - Uses Recraft API with cat prompts
2. ✅ **Generates 5 dog images** - Uses Recraft API with dog prompts
3. ✅ **Saves as drafts** - Images remain `draft: true` (not published)
4. ✅ **Commits changes** - Pushes to repository with timestamp

**Total**: 10 images generated per day (5 cats + 5 dogs)

**Important**: Images are saved as drafts and require manual publishing.

## Next Steps

### 1. Add GitHub Secrets

You need to add these secrets to your GitHub repository:

**Go to**: Repository → Settings → Secrets and variables → Actions → New repository secret

**Required Secrets:**
- `RECRAFT_API_KEY`
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
2. Select **"Daily Image Generation"**
3. Click **"Run workflow"**
4. Select branch
5. Choose animal type:
   - **cats** - Generate only cat images
   - **Dogs** - Generate only dog images  
   - **both** - Generate both cats and dogs
6. Click **"Run workflow"**

## Local Testing

You can test the scripts locally:

```bash
# Generate 5 cat images
npm run generate animals cats 5

# Generate 5 dog images  
npm run generate animals Dogs 5

# Publish all drafts (set draft: false)
npm run publish:drafts
```

## Publishing Images

### Manual Publishing

Generated images remain as drafts. To publish them:

**Option 1: Manually edit files**
- Open the `.md` files in `content/animals/cats/` or `content/animals/Dogs/`
- Change `draft: true` to `draft: false`
- Commit and push

**Option 2: Use the publish script**
```bash
npm run publish:drafts
```
This will set `draft: false` on ALL draft images.

### Enable Auto-Publishing

To automatically publish images after generation, edit `.github/workflows/daily-image-generation.yml` and uncomment:

```yaml
# Auto-publish disabled - images remain as draft: true
# - name: Set all new images to draft=false
#   run: npx ts-node scripts/morning-routine/tasks/publish-drafts.ts
```

Change to:

```yaml
- name: Set all new images to draft=false
  run: npx ts-node scripts/morning-routine/tasks/publish-drafts.ts
```

Then commit and push the workflow file.

## Customization

### Change Schedule

Edit `.github/workflows/daily-image-generation.yml`:

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

Edit the workflow file and change the count parameter:

```yaml
- name: Generate 5 Cat Images
  run: npm run generate animals cats 10  # Change 5 to 10

- name: Generate 5 Dog Images
  run: npm run generate animals Dogs 10  # Change 5 to 10
```

This will generate 10 images per run instead of 5.

### Add More Collections

To generate images for additional animal types:

1. Add new collection prompt files in `scripts/morning-routine/config/prompts/`
2. Add generation step to workflow:

```yaml
- name: Generate 5 Rabbit Images
  run: npm run generate animals rabbits 5
```

## Monitoring

### View Workflow Runs
- Go to **Actions** tab in GitHub
- View history of all runs
- Click any run to see detailed logs

### Check Generated Files
- New images appear in `content/animals/cats/` and `content/animals/Dogs/`
- Each run creates a commit with timestamp

## Troubleshooting

### Workflow Not Running
- Check if workflow is enabled in Actions tab
- Verify cron schedule is correct
- Check workflow permissions are set

### Images Not Publishing
- Verify `publish-drafts.ts` script is running
- Check if `draft: false` is being set in markdown files
- Review workflow logs for errors

### API Errors
- Check API keys are valid
- Verify rate limits haven't been exceeded
- Review R2 and Cloudflare Images quotas

## Support

For detailed setup instructions, see:
- `.github/GITHUB_ACTIONS_SETUP.md` - Complete setup guide
- `scripts/morning-routine/tasks/generate-batch.ts` - Image generation logic
- `scripts/morning-routine/tasks/publish-drafts.ts` - Publishing logic

---

**Status**: ✅ Ready to deploy
**Last Updated**: December 15, 2024

