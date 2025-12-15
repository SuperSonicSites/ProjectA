# GitHub Actions Setup Guide

This document explains how to set up the daily image generation workflow.

## Overview

The workflow runs once daily:
- **5:00 AM EST (10:00 AM UTC)**: Generates 5 cat images + 5 dog images

Each run:
1. Generates 10 images total (5 cats + 5 dogs)
2. **Saves as drafts** (`draft: true`) - images are NOT published automatically
3. Commits and pushes the changes to the repository

**Note**: Images remain as drafts until you manually publish them.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### Navigation
Go to: **Repository Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Secrets to Add

#### Recraft API
- `RECRAFT_API_KEY` - Your Recraft API key for image generation

#### Google Gemini API (if used as fallback)
- `GEMINI_API_KEY` - Your Google Gemini API key

#### Cloudflare R2 Storage
- `R2_ACCOUNT_ID` - Your Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key ID
- `R2_SECRET_ACCESS_KEY` - R2 secret access key
- `R2_BUCKET_NAME` - R2 bucket name (e.g., `paperpause`)
- `R2_PUBLIC_URL` - Public URL for R2 bucket (e.g., `https://img.paperpause.app`)

#### Cloudflare Images
- `CF_IMAGES_ACCOUNT_ID` - Cloudflare Images account ID
- `CF_IMAGES_API_TOKEN` - Cloudflare Images API token
- `CF_IMAGES_ACCOUNT_HASH` - Cloudflare Images account hash

## How to Get These Values

You can find all these values in your local `.dev.vars` file. Simply copy each value to the corresponding GitHub secret.

### Quick Copy Commands

If you're on the repository settings page, copy these values from your `.dev.vars`:

```bash
# View your .dev.vars file (DO NOT commit this file!)
cat .dev.vars
```

Then manually add each value as a secret in GitHub.

## Manual Trigger

You can also trigger the workflow manually:

1. Go to **Actions** tab in your repository
2. Select **Daily Image Generation** workflow
3. Click **Run workflow**
4. Choose the branch
5. Select animal type:
   - **cats** - Generate only cat images
   - **Dogs** - Generate only dog images
   - **both** - Generate both cats and dogs
6. Click **Run workflow**

## Workflow Schedule

The workflow runs automatically once daily:
- **5:00 AM EST (10:00 AM UTC)** - Generates 5 cat images + 5 dog images

**Note**: During Daylight Saving Time (EDT), EST becomes UTC-4:
- **5:00 AM EDT (9:00 AM UTC)** - Update cron to `0 9 * * *` if you want to keep the same local time

**To change**: Edit `.github/workflows/daily-image-generation.yml` and modify the cron schedule

### Common Cron Examples
- `0 10 * * *` - Daily at 10:00 AM UTC (5 AM EST)
- `0 11 * * *` - Daily at 11:00 AM UTC (6 AM EST)
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1-5` - Weekdays at 9:00 AM UTC

## Troubleshooting

### Workflow Fails
1. Check the Actions tab for error logs
2. Verify all secrets are correctly set
3. Ensure the secrets match your local `.dev.vars` values

### No Images Generated
1. Check if the API keys are valid
2. Verify R2 and Cloudflare Images are properly configured
3. Check API rate limits

### Git Push Fails
1. Ensure the repository has workflows enabled
2. Check if the `GITHUB_TOKEN` has write permissions:
   - Go to **Settings** → **Actions** → **General**
   - Under "Workflow permissions", select "Read and write permissions"

### Re-enable Auto-Publishing

If you want images to publish automatically (set `draft: false`), uncomment these lines in the workflow:

```yaml
# Auto-publish disabled - images remain as draft: true
# - name: Set all new images to draft=false
#   run: npx ts-node scripts/morning-routine/tasks/publish-drafts.ts
```

Remove the `#` to enable:

```yaml
- name: Set all new images to draft=false
  run: npx ts-node scripts/morning-routine/tasks/publish-drafts.ts
```

## Security Notes

⚠️ **Important**:
- Never commit `.dev.vars` to Git (it's in `.gitignore`)
- GitHub Secrets are encrypted and safe
- Only repository administrators can view/edit secrets
- Secrets are masked in workflow logs

## Monitoring

To monitor the workflow:
1. Go to **Actions** tab
2. View recent workflow runs
3. Check logs for each step
4. Review committed changes in the repository

## Disable Workflow

To temporarily disable the workflow:
1. Go to **Actions** tab
2. Select **Daily Image Generation**
3. Click the `...` menu → **Disable workflow**

To permanently disable:
- Delete or rename `.github/workflows/daily-image-generation.yml`

