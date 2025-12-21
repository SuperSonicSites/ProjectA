# Automation Schedule (Baseline Workflow)

This file documents the **current baseline workflow schedule**.  
Autonomy vNext scheduling (Foreman input) is defined in `mission-control/rollout-schedule.md`.

## Daily Schedule (ET)

The baseline workflow runs once per day.

## UTC Times (for GitHub Actions)

```
10:00 AM UTC → Daily baseline run (5:00 AM ET)
```

## Cron Configuration

```yaml
schedule:
  # Baseline daily run at ~5 AM ET
  - cron: '0 10 * * *'
# **PaperPause: Baseline Automation Schedule**

This document outlines the daily automation schedule for content generation and publication.

## **1. Daily Generation Schedule**

The primary content pipeline runs automatically once per day.

| Task | Time (EST) | Time (UTC) | Frequency |
| :--- | :--- | :--- | :--- |
| **Image Generation & SEO** | 5:00 AM | 10:00 AM | Daily |

*Note: The schedule uses UTC time. Adjustments for Daylight Saving Time (EST to EDT) happen automatically via the cron configuration.*

## **2. Daily Content Yield (Baseline)**

Each run of the baseline pipeline produces:

| Collection | Count | Status |
| :--- | :--- | :--- |
| **Cats** | 1 | Published |
| **Dogs** | 1 | Published |
| **Horses** | 1 | Published |
| **Butterflies** | 1 | Published |
| **Sharks** | 1 | Published |
| **Total** | **5 Assets** | |

## **3. Workflow Execution Steps**

When the schedule triggers (10:00 AM UTC), the following sequence is executed:

1.  **Environment Setup:** GitHub runner starts, installs Node.js dependencies.
2.  **API Connections:** Connects to Gemini API (Vision/Pro) and Cloudflare.
3.  **Batch Generation:** Runs `generate-batch.ts` for each collection in the workflow matrix.
    *   Generates a new, unique, high-quality coloring page image.
    *   Uploads the raw image to Cloudflare R2.
    *   Uploads the optimized image to Cloudflare Images.
4.  **SEO Review:** Runs `seo-review-batch.ts` to analyze the new images and generate metadata (Title, Description, Alt Text).
5.  **Commit & Push:** Commits the new markdown files to the repository.
6.  **Reporting:** Posts a completion report to the tracking issue.

## **4. Autonomy vNext Scheduling**

Autonomy vNext uses Foreman + Designer and reads the weekly rollout schedule from:
- `mission-control/rollout-schedule.md`

The GitHub Actions workflow matrix will eventually be sourced from Foreman output instead of hardcoding collections.

---

**Quick Reference (Baseline):**
- Daily run: 5:00 AM ET (10:00 AM UTC)
- Per run: 5 assets (cats, dogs, horses, butterflies, sharks)
- Publishing: baseline behavior currently writes `draft: false` in generated content; treat this doc as baseline only and defer to PRD for autonomy behavior.

