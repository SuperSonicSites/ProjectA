# GitHub Actions Setup Guide

This document explains how to set up the daily image generation workflow.

## Overview

# GitHub Actions: Content Pipeline Setup

This guide details the setup of the automated content pipeline that generates and publishes coloring pages daily.

## 1. Workflow Overview

The workflow (`.github/workflows/daily-generate-and-optimize.yml`) runs daily to:
1.  **Generate:** Creates 1 new coloring page for each target collection (Cats, Dogs, Horses, Butterflies, Sharks).
2.  **Optimize:** Uses AI to generate SEO titles, descriptions, and alt text.
3.  **Commit:** Automatically pushes the new content to the repository.

## 2. Required Secrets

The following secrets must be configured in GitHub (Settings > Secrets and variables > Actions):

| Secret | Purpose |
| :--- | :--- |
| `GEMINI_API_KEY` | Powers the image generation and SEO analysis. |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID. |
| `R2_ACCESS_KEY_ID` | R2 API Key ID. |
| `R2_SECRET_ACCESS_KEY` | R2 API Secret. |
| `R2_BUCKET_NAME` | R2 Bucket for raw image storage. |
| `R2_PUBLIC_URL` | Public URL for the R2 bucket. |
| `CF_IMAGES_ACCOUNT_ID` | Cloudflare Images Account ID. |
| `CF_IMAGES_API_TOKEN` | Cloudflare Images API Token. |
| `CF_IMAGES_ACCOUNT_HASH` | Cloudflare Images Account Hash. |

## 3. Manual Trigger

You can trigger the generation manually for testing:
1.  Go to the **Actions** tab in GitHub.
2.  Select **Daily Generate & Optimize Coloring Pages**.
3.  Click **Run workflow**.

## 4. Content Status (Drafts vs. Published)

By default, the automated pipeline saves images with `draft: false` in the frontmatter, meaning they are **published immediately** upon the next Hugo build.

*   To change this behavior to manual approval, modify the generation script to set `draft: true`.
*   The `publish-drafts.ts` script can be used to bulk-approve drafts if needed.

## 5. Troubleshooting

*   **No images generated:** Check the `generate` job logs in GitHub Actions. Ensure all API keys are valid.
*   **SEO optimization failed:** The `optimize` step is set to `continue-on-error: true`. If it fails, the image will still be committed with default metadata.
*   **Permissions error:** Ensure the `GITHUB_TOKEN` has `write` permissions for `contents` and `issues`.

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

