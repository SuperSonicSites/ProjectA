# Cloudflare Secrets Setup Guide

This guide explains how to configure API keys and secrets for the morning routine image generation system using Cloudflare Wrangler.

## 🎯 Overview

The project uses **`.dev.vars`** for local secret management:
- Secrets are stored in `.dev.vars` and never committed to Git (it's gitignored)
- For Cloudflare Pages deployment, use `wrangler secret put` to set production secrets
- Scripts automatically load `.dev.vars` via `dotenv-cli` and access via `process.env`

## 🚀 Quick Start (Recommended for Local Dev)

### 1. Create `.dev.vars` File

```bash
# Copy the example template
cp .dev.vars.example .dev.vars
```

### 2. Fill In Your API Keys

Edit `.dev.vars` with your actual credentials:

```env
# Google AI (Gemini) - for image generation
GEMINI_API_KEY=AIzaSy...your_key_here

# Cloudflare R2 - for image storage
R2_ACCOUNT_ID=1234567890abcdef
R2_ACCESS_KEY_ID=abcdef1234567890
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=paperpause
R2_PUBLIC_URL=https://img.paperpause.app

# Cloudflare Images - for CDN delivery with variants
CF_IMAGES_ACCOUNT_ID=1234567890abcdef
CF_IMAGES_API_TOKEN=your_cf_images_token
CF_IMAGES_ACCOUNT_HASH=your_account_hash

# Local development
DASHBOARD_PORT=3000
```

### 3. Get Your API Keys

#### GEMINI_API_KEY
1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy and paste into `.dev.vars`

#### R2 Credentials
1. Go to: Cloudflare Dashboard > R2 > Manage R2 API Tokens
2. Create API Token
3. Copy Account ID, Access Key ID, and Secret Access Key
4. Note your bucket name (e.g., "paperpause")
5. Note your public URL (e.g., "https://img.paperpause.app")

#### Cloudflare Images (Optional)
1. Go to: Cloudflare Dashboard > Images > API Tokens
2. Create API Token
3. Copy Account ID, API Token, and Account Hash
4. Note: This is optional - system falls back to R2 if not configured

### 4. Test Your Setup

```bash
# Start the dashboard
npm run dashboard

# You should see NO warnings about missing keys
# Dashboard should start on http://localhost:3000
```

## 🔧 Production: Cloudflare Pages Secrets

For deploying to Cloudflare Pages (production), you need to set secrets in Cloudflare:

### Set Secrets via Wrangler CLI

```bash
# Login to Cloudflare (first time only)
wrangler login

# Set each secret for Cloudflare Pages deployment
# (These are separate from local .dev.vars)
wrangler pages secret put GEMINI_API_KEY
wrangler pages secret put R2_ACCOUNT_ID
wrangler pages secret put R2_ACCESS_KEY_ID
wrangler pages secret put R2_SECRET_ACCESS_KEY
wrangler pages secret put R2_BUCKET_NAME
wrangler pages secret put R2_PUBLIC_URL
wrangler pages secret put CF_IMAGES_ACCOUNT_ID
wrangler pages secret put CF_IMAGES_API_TOKEN
wrangler pages secret put CF_IMAGES_ACCOUNT_HASH
```

### List Your Secrets

```bash
# See which secrets are configured for Pages
wrangler pages secret list
```

### Delete a Secret

```bash
# Remove a secret from Cloudflare Pages
wrangler pages secret delete GEMINI_API_KEY
```

## 🔄 How Scripts Access Secrets

When you run:
```bash
npm run dashboard
npm run generate
```

Under the hood:
1. `dotenv-cli` loads your `.dev.vars` file
2. Environment variables are injected into `process.env`
3. Your script accesses them via `process.env.GEMINI_API_KEY`, etc.
4. The actual command that runs: `dotenv -e .dev.vars -- ts-node scripts/...`

## 🛡️ Security Best Practices

### ✅ DO:
- Use `.dev.vars` for local development
- Use `wrangler pages secret put` for Cloudflare Pages production secrets
- Rotate keys immediately if they're exposed
- Keep `.dev.vars` in `.gitignore` (already configured)

### ❌ DON'T:
- Never commit `.dev.vars` to Git
- Never hardcode API keys in source code
- Never share your `.dev.vars` file
- Never use production keys in your local `.dev.vars`

## 🚨 If Secrets Were Exposed

If you accidentally committed secrets to Git:

### 1. Rotate ALL Keys Immediately

**Gemini API:**
- Visit: https://makersuite.google.com/app/apikey
- Delete the exposed key
- Create a new key

**Cloudflare R2:**
- Dashboard > R2 > Manage R2 API Tokens
- Revoke the exposed token
- Create a new token

**Cloudflare Images:**
- Dashboard > Images > API Tokens
- Revoke the exposed token
- Create a new token

### 2. Update Your `.dev.vars`

Replace old keys with new ones in your `.dev.vars` file.

### 3. Clean Git History (Optional)

```bash
# Use BFG Repo-Cleaner or git-filter-repo to remove secrets from history
# This is advanced - consult Git documentation or your team lead

# Example with BFG:
# brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/
# bfg --replace-text passwords.txt  # file containing exposed secrets
# git reflog expire --expire=now --all
# git gc --prune=now --aggressive
# git push --force
```

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | Yes | Google AI API key for image generation | `AIzaSy...` |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID | `1234567890abcdef` |
| `R2_ACCESS_KEY_ID` | Yes | R2 API access key | `abcdef1234567890` |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API secret key | `your_secret_key` |
| `R2_BUCKET_NAME` | No | R2 bucket name (default: paperpause) | `paperpause` |
| `R2_PUBLIC_URL` | No | Public URL base for R2 | `https://img.paperpause.app` |
| `CF_IMAGES_ACCOUNT_ID` | No | Cloudflare Images account ID | `1234567890abcdef` |
| `CF_IMAGES_API_TOKEN` | No | Cloudflare Images API token | `your_token` |
| `CF_IMAGES_ACCOUNT_HASH` | No | CF Images account hash for URLs | `your_hash` |
| `DASHBOARD_PORT` | No | Dashboard server port (default: 3000) | `3000` |

## 🆘 Troubleshooting

### "WARNING: GEMINI_API_KEY is missing"

**Solution:** Create `.dev.vars` file from `.dev.vars.example` and fill in your API keys

### Scripts fail with "401 Unauthorized"

**Solution:** Check that your API keys are valid and not expired

### "Cannot find module 'dotenv-cli'"

**Solution:** Run `npm install` to install all dependencies including `dotenv-cli`

### Secrets work locally but not on Cloudflare Pages

**Solution:** Set secrets in Cloudflare Pages using `wrangler pages secret put` (not just in `.dev.vars`)

## 📚 Additional Resources

- [Wrangler Secrets Documentation](https://developers.cloudflare.com/workers/wrangler/commands/#secret)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)
- [Google AI Studio](https://makersuite.google.com/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)

---

**Need help?** Check the [CMS_QUICK_START.md](./CMS_QUICK_START.md) guide or [TESTING.md](./TESTING.md) for more details.

