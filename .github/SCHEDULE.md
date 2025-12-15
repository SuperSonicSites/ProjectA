# Automated Image Generation Schedule

## Daily Schedule (EST)

```
🌅 5:00 AM EST → 🐱 5 Cat Images + 🐶 5 Dog Images
```

**Total per day**: 10 images (5 cats + 5 dogs)

## UTC Times (for GitHub Actions)

```
10:00 AM UTC → 🐱 Cats + 🐶 Dogs  (5:00 AM EST)
```

## Cron Configuration

```yaml
schedule:
  # Both cats and dogs at 5 AM EST
  - cron: '0 10 * * *'
```

## Daylight Saving Time Adjustment

During **EDT** (March - November), EST becomes UTC-4 instead of UTC-5.

If you want to maintain the same local time (5 AM) during DST:

```yaml
schedule:
  # 5 AM EDT
  - cron: '0 9 * * *'
```

## Time Zone Conversion Reference

| Local Time | EST (UTC-5) | EDT (UTC-4) |
|------------|-------------|-------------|
| 5:00 AM    | 10:00 UTC   | 9:00 UTC    |
| 6:00 AM    | 11:00 UTC   | 10:00 UTC   |

## What Happens Each Run

1. ✅ Workflow triggers at 5:00 AM EST (10:00 AM UTC)
2. ✅ Generates 5 cat images using Recraft API
3. ✅ Generates 5 dog images using Recraft API
4. ✅ Uploads all images to Cloudflare R2 and CF Images
5. ✅ Creates markdown files with metadata
6. ✅ Saves as **drafts** (`draft: true`) - NOT published automatically
7. ✅ Commits and pushes to repository

**Note**: Images remain as drafts until manually published.

## Manual Override

You can manually trigger the workflow anytime with options:
- Generate **cats only** - 5 cat images
- Generate **dogs only** - 5 dog images
- Generate **both** - 5 cats + 5 dogs

---

**Quick Reference:**
- Daily run: 5:00 AM EST (10:00 AM UTC)
- Animals: Both 🐱 Cats + 🐶 Dogs
- Per run: 10 images (5 cats + 5 dogs)
- Status: Saved as drafts (manual publishing required)

