# Cloudflare Images Configuration Guide

## Overview
This guide explains how to configure Cloudflare Images variants for optimal image delivery across desktop, mobile, RSS feeds, and social media.

---

## Prerequisites

1. **Cloudflare Account** with Images enabled
2. **API Token** with Images Read & Write permissions
3. **Account Hash** for delivery URLs

---

## Step 1: Enable Cloudflare Images

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Images** in the left sidebar
3. Click **Enable Cloudflare Images** if not already enabled
4. Note your **Account Hash** (visible in delivery URL examples)

---

## Step 2: Create API Token

1. Go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use template: **Edit Cloudflare Images**
4. Or create custom token with permissions:
   - **Account** → **Cloudflare Images** → **Read** & **Write**
5. Save the token securely (needed for `.env`)

---

## Step 3: Configure Image Variants

Navigate to **Images** → **Variants** and create these 5 variants:

### Variant 1: `desktop`
**Purpose**: Desktop web preview
```
Name: desktop
Width: 1200
Height: 1600
Fit: scale-down
```

**Settings**:
- ✅ Maintain aspect ratio
- ✅ Never upscale
- ✅ Preserve transparency
- Format: Auto (WebP/AVIF with PNG fallback)
- Quality: 85%

---

### Variant 2: `mobile`
**Purpose**: Mobile web preview
```
Name: mobile
Width: 600
Height: 800
Fit: scale-down
```

**Settings**:
- ✅ Maintain aspect ratio
- ✅ Never upscale
- ✅ Preserve transparency
- Format: Auto
- Quality: 85%

---

### Variant 3: `rss`
**Purpose**: RSS feeds & Pinterest (unified format)
```
Name: rss
Width: 1000
Height: 1500
Fit: cover
```

**Settings**:
- ⚠️ **Fit mode: cover** (may crop slightly from 3:4 to 2:3)
- ✅ Preserve transparency
- Format: Auto
- Quality: 90%

**Note**: 1000x1500 is Pinterest's optimal pin size. RSS feed will push directly to Pinterest using this format.

---

### Variant 4: `pinterest`
**Purpose**: Social media sharing (alias for RSS)
```
Name: pinterest
Width: 1000
Height: 1500
Fit: cover
```

**Settings**:
- ⚠️ **Fit mode: cover** (matches RSS format)
- ✅ Preserve transparency
- Format: Auto
- Quality: 90%

**Note**: This is functionally identical to the `rss` variant. Both use 1000x1500px for Pinterest compatibility.

---

### Variant 5: `thumbnail`
**Purpose**: Grid/masonry previews
```
Name: thumbnail
Width: 300
Height: 400
Fit: scale-down
```

**Settings**:
- ✅ Maintain aspect ratio
- ✅ Never upscale
- ✅ Preserve transparency
- Format: Auto
- Quality: 80%

---

## Step 4: Add Environment Variables

Update your `.env` file with these values:

```env
# Cloudflare Images Configuration
CF_IMAGES_ACCOUNT_ID=your_account_id_here
CF_IMAGES_API_TOKEN=your_api_token_here
CF_IMAGES_ACCOUNT_HASH=your_account_hash_here
```

### Where to Find These Values:

**Account ID**:
- Dashboard → Click your account name → Copy Account ID

**API Token**:
- Generated in Step 2 above

**Account Hash**:
- Dashboard → Images → Look at any delivery URL
- Format: `https://imagedelivery.net/{ACCOUNT_HASH}/{image_id}/public`
- The hash is the alphanumeric string between `imagedelivery.net/` and the next `/`

---

## Step 5: Add to Hugo Configuration

Edit `hugo.toml` and add your account hash:

```toml
[params]
  description = "Discover the best free printable coloring pages..."
  cf_images_hash = "YOUR_ACCOUNT_HASH_HERE"
```

Replace `YOUR_ACCOUNT_HASH_HERE` with the actual hash from Step 4.

---

## Step 6: Verify Configuration

Run the environment validation:

```bash
npm run validate:env
```

Expected output:
```
✅ CF_IMAGES_ACCOUNT_ID is configured
✅ CF_IMAGES_API_TOKEN is configured
✅ CF_IMAGES_ACCOUNT_HASH is configured
```

---

## Testing Image Variants

After configuration, generate a test image:

```bash
npm run generate 1
```

If CF Images is configured, you should see:
```
[CF Images] ✅ Uploaded: cat-123.png → abc123xyz
[Upload] ✅ CF Images configured for web delivery
```

### Test Variant URLs

Replace `{hash}` with your account hash and `{id}` with the generated image ID:

```
Desktop:   https://imagedelivery.net/{hash}/{id}/desktop
Mobile:    https://imagedelivery.net/{hash}/{id}/mobile
RSS:       https://imagedelivery.net/{hash}/{id}/rss
Pinterest: https://imagedelivery.net/{hash}/{id}/pinterest
Thumbnail: https://imagedelivery.net/{hash}/{id}/thumbnail
```

Open each URL in your browser to verify:
- ✅ Image loads correctly
- ✅ Dimensions match variant specification
- ✅ Transparent background is preserved
- ✅ Black outlines only (if using new prompts)

---

## Variant Comparison Table

| Variant | Dimensions | Ratio | File Size* | Use Case |
|---------|------------|-------|------------|----------|
| `desktop` | 1200×1600 | 3:4 | ~150-250KB | Desktop web |
| `mobile` | 600×800 | 3:4 | ~40-80KB | Mobile web |
| `rss` | 1000×1500 | 2:3 | ~100-180KB | RSS feeds → Pinterest |
| `pinterest` | 1000×1500 | 2:3 | ~100-180KB | Social sharing (same as RSS) |
| `thumbnail` | 300×400 | 3:4 | ~15-30KB | Grid previews |

*File sizes are estimates for WebP format. PNG fallback will be larger.

---

## Troubleshooting

### Issue: Images not uploading to CF Images
**Solution**: Check API token permissions and account ID

### Issue: Variants not found (404 errors)
**Solution**: Ensure variant names match exactly (case-sensitive)

### Issue: Background not transparent
**Solution**: 
1. Check original image has transparency
2. Verify "Preserve transparency" is enabled in variant settings
3. May need to update Gemini prompts (see `prompts.ts`)

### Issue: Images look cropped
**Solution**: Use `scale-down` instead of `cover` fit mode (except for Pinterest variant)

---

## Cost Estimation

**Cloudflare Images Pricing**:
- $5/month for up to 100,000 images stored
- $1/month per 100,000 images delivered
- No egress fees

**For 1,000 coloring pages**:
- Storage: $0.05/month
- Estimated 50k views/month × 2 variants per page = 100k deliveries
- Delivery: ~$1/month
- **Total: ~$6/month**

---

## Next Steps

1. ✅ Configure all 5 variants in Cloudflare Dashboard
2. ✅ Add credentials to `.env`
3. ✅ Add account hash to `hugo.toml`
4. ✅ Run `npm run validate:env`
5. ✅ Test with `npm run generate 1`
6. ✅ Verify variant URLs in browser
7. ✅ Build site with `npm run build`
8. ✅ Deploy to production

---

## Support Resources

- [Cloudflare Images Documentation](https://developers.cloudflare.com/images/)
- [Image Variants Guide](https://developers.cloudflare.com/images/transform-images/)
- [API Reference](https://developers.cloudflare.com/api/operations/cloudflare-images-upload-an-image-via-url)

