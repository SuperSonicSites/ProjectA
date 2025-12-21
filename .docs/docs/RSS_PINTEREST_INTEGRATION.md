# RSS to Pinterest Integration Guide

## Overview
This guide explains how PaperPause's RSS feed is configured to automatically publish coloring pages to Pinterest boards using Pinterest's RSS auto-publish feature.

---

## How It Works

```
Hugo Site → RSS Feed (XML) → Pinterest RSS Connector → Auto-Creates Pins
   ↓              ↓                      ↓                      ↓
Content      1000x1500px          24hr refresh          Pinterest Board
Published       Images            (up to 200/day)        "Cats Coloring"
```

---

## RSS Feed Configuration

### Feed URL Structure

**Main Site RSS**: `https://paperpause.app/index.xml`  
**Category-Specific RSS**: `https://paperpause.app/animals/index.xml`  
**Collection-Specific RSS**: `https://paperpause.app/animals/cats/index.xml` ✅ **Use This for Pinterest**

### Why Collection-Specific Feeds?

Each collection (e.g., "cats") should have its own Pinterest board, so we use collection-specific RSS feeds:

- **Cats → Pinterest Board "Cat Coloring Pages"**
- **Dogs → Pinterest Board "Dog Coloring Pages"**  
- **Butterflies → Pinterest Board "Butterfly Coloring Pages"**

This allows you to:
- Target specific Pinterest audiences
- Organize content by theme
- Meet Pinterest's board-per-feed requirement

---

## Pinterest RSS Requirements ✅

Our implementation meets all Pinterest specs:

### 1. Format: RSS 2.0 ✅
```xml
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
```
- ✅ RSS 2.0 format (Pinterest supports RSS 2.* and RSS 1.*)
- ✅ XML format
- ✅ Includes media:content namespace for images

### 2. Required Tags Per Item ✅

Each `<item>` in our RSS feed includes:

```xml
<item>
  <title>Cat Coloring Page: Gardener Cat watering a</title>  ✅ Pin Title
  <link>https://paperpause.app/animals/cats/gardener-cat/</link>  ✅ Claimed Domain
  <description>A beautiful cat coloring page...</description>  ✅ Pin Description
  <pubDate>Sun, 15 Dec 2024 02:13:58 -0700</pubDate>  ✅ Publish Date
  
  <!-- Image Tags for Pinterest -->
  <enclosure url="https://imagedelivery.net/{hash}/{id}/rss" type="image/png" length="0" />  ✅
  <media:content url="https://imagedelivery.net/{hash}/{id}/rss" medium="image" width="1000" height="1500">
    <media:title>Cat Coloring Page: Gardener Cat</media:title>
    <media:description>Gardener Cat watering a pot...</media:description>
  </media:content>
</item>
```

### 3. Image Specifications ✅

Pinterest extracts images from these tags (in order of priority):
1. **`<media:content>`** ← Our primary method
2. **`<enclosure>`** ← Our fallback
3. **`<image>`** (not used in our implementation)

**Our Image Format**:
- ✅ **Dimensions**: 1000x1500px (Pinterest's optimal pin size)
- ✅ **Aspect Ratio**: 2:3 (Pinterest standard)
- ✅ **Format**: PNG with transparent background
- ✅ **Quality**: High resolution, black outlines only
- ✅ **CDN**: Cloudflare Images for fast delivery

### 4. Claimed Domain ✅

All links point to `https://paperpause.app/` which must be:
- ✅ Claimed in Pinterest business account
- ✅ Verified with meta tag or HTML file upload
- ✅ Consistent across all RSS items

---

## Setting Up Pinterest RSS Auto-Publish

### Step 1: Claim Your Website on Pinterest

1. Log in to [Pinterest Business Account](https://business.pinterest.com/)
2. Go to **Settings** → **Claimed Accounts**
3. Click **Claim** next to Website
4. Enter: `https://paperpause.app`
5. Choose verification method:
   - **HTML tag** (add to `head.html`) ← Recommended
   - **HTML file upload**
   - **TXT record** (DNS)

**Add to `themes/visual-sanctuary-theme/layouts/partials/head.html`:**
```html
<meta name="p:domain_verify" content="YOUR_PINTEREST_VERIFICATION_CODE"/>
```

### Step 2: Connect RSS Feed for Cats

1. In Pinterest, go to **Settings** → **Create Pins in bulk**
2. Under **Auto-publish**, click **Connect RSS feed**
3. Enter feed URL: `https://paperpause.app/animals/cats/index.xml`
4. Select board: **"Cat Coloring Pages"** (create if doesn't exist)
5. Click **Save**

Pinterest will now:
- ✅ Check feed every 24 hours
- ✅ Auto-create Pins for new items (up to 200/day)
- ✅ Use 1000x1500px images from `<media:content>`
- ✅ Link Pins back to your website

### Step 3: Repeat for Other Collections

| Collection | RSS Feed URL | Pinterest Board |
|------------|--------------|-----------------|
| Cats | `https://paperpause.app/animals/cats/index.xml` | Cat Coloring Pages |
| Dogs | `https://paperpause.app/animals/dogs/index.xml` | Dog Coloring Pages |
| Butterflies | `https://paperpause.app/animals/butterflies/index.xml` | Butterfly Coloring Pages |
| Horses | `https://paperpause.app/animals/horses/index.xml` | Horse Coloring Pages |

---

## How Pinterest Processes Your Feed

### Timeline
```
1. You publish new content → Hugo generates RSS feed with new <item>
2. Within 24 hours → Pinterest fetches your RSS feed
3. Pinterest reads <media:content> → Downloads 1000x1500px image
4. Pinterest creates Pin → Posted to designated board
5. Pin links back → Traffic to your website
```

### Publishing Limits
- **Max**: 200 Pins per day per feed
- **Order**: Oldest content published first (from RSS feed)
- **Updates**: Feed checked every 24 hours
- **Boards**: Each feed publishes to ONE board only

### What Pinterest Sees

When Pinterest reads `https://paperpause.app/animals/cats/index.xml`:

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Cats on PaperPause</title>
    <link>https://paperpause.app/animals/cats/</link>
    <description>Cat coloring pages</description>
    
    <item>
      <title>Cat Coloring Page: Gardener Cat</title>
      <link>https://paperpause.app/animals/cats/gardener-cat/</link>
      <description>A beautiful gardener cat watering flowers...</description>
      <media:content 
        url="https://imagedelivery.net/abc123/xyz789/rss" 
        width="1000" 
        height="1500"/>
    </item>
    
    <!-- More items... -->
  </channel>
</rss>
```

Pinterest extracts:
- ✅ **Pin Title**: "Cat Coloring Page: Gardener Cat"
- ✅ **Pin Description**: "A beautiful gardener cat watering flowers..."
- ✅ **Pin Image**: Downloads from `media:content` URL (1000x1500px)
- ✅ **Pin Link**: `https://paperpause.app/animals/cats/gardener-cat/`

---

## Content Workflow for Pinterest

### Publishing New Content

1. **Generate images**: `npm run generate 5`
2. **Approve in dashboard**: `npm run dashboard`
3. **Build site**: `npm run build`
4. **Deploy to Cloudflare Pages**
5. **RSS feed auto-updates** with new items
6. **Pinterest pulls feed** within 24 hours
7. **Pins auto-created** on designated board

### Draft vs. Published

**Important**: Only published content appears in RSS feeds.

In frontmatter:
```yaml
draft: true   # ❌ Not in RSS feed (hidden)
draft: false  # ✅ In RSS feed (published to Pinterest)
```

When you approve content in the dashboard, it sets `draft: false` automatically.

---

## Troubleshooting

### Common Pinterest RSS Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "RSS feed already exists" | Feed URL already connected | Use different feed or disconnect old one |
| "RSS feed cannot be fetched" | Feed URL not accessible | Verify feed loads in browser |
| "RSS feed cannot be parsed" | Invalid XML | Validate feed at feedvalidator.org |
| "RSS feed unknown format" | Not RSS 2.0 or RSS 1.0 | Check RSS version in `<rss>` tag |
| "Links not under claimed domain" | Wrong domain in `<link>` tags | Ensure all links use paperpause.app |

### Testing Your RSS Feed

**1. Validate XML Structure**:
```bash
curl https://paperpause.app/animals/cats/index.xml
```

**2. Check feed with validator**:
- Visit: https://validator.w3.org/feed/
- Enter: `https://paperpause.app/animals/cats/index.xml`
- Verify: No errors

**3. Test image URLs**:
```bash
curl -I https://imagedelivery.net/{hash}/{id}/rss
# Should return: HTTP/1.1 200 OK
```

**4. Verify in RSS reader**:
- Use Feedly or similar
- Subscribe to your feed
- Check images display correctly

---

## Optimizing for Pinterest

### Image Best Practices

✅ **Do**:
- Use 1000x1500px (2:3 ratio) - Pinterest's optimal size
- High-quality transparent PNGs with black outlines
- Coloring book style (clean, bold lines)
- Vertical orientation (portrait)

❌ **Don't**:
- Square images (won't perform well)
- Horizontal images (cut off on Pinterest)
- Low resolution (<800px width)
- Busy backgrounds or text overlays

### Title & Description Best Practices

**Good Pin Title** (from our RSS `<title>`):
```
Cat Coloring Page: Gardener Cat watering a pot
```
- ✅ Clear subject
- ✅ Descriptive
- ✅ Includes keywords
- ✅ Under 100 characters

**Good Pin Description** (from our RSS `<description>`):
```
A beautiful cat coloring page generated by AI. This printable 
coloring page features a cute cat watering flowers. Perfect for 
all ages with bold, simple lines. Download and print for free!
```
- ✅ Engaging copy
- ✅ Keywords (coloring page, printable, free)
- ✅ Call to action
- ✅ Describes image

---

## Monitoring Performance

### Pinterest Analytics

Track your RSS-generated Pins:

1. Go to **Pinterest Analytics**
2. Filter by **Source: RSS feed**
3. Monitor:
   - **Impressions**: How many people see your Pins
   - **Saves**: How many people save to their boards
   - **Clicks**: Traffic driven to your website
   - **Best performers**: Which images get most engagement

### Optimization Tips

**If Pins aren't performing**:
- ✅ Improve Pin descriptions (more keywords)
- ✅ Test different image styles
- ✅ Post at optimal times (Pinterest does this automatically)
- ✅ Use relevant boards (specific, not general)

**If Feed not connecting**:
- ✅ Verify website claim
- ✅ Check feed URL in browser
- ✅ Validate XML structure
- ✅ Ensure all links use claimed domain

---

## Current Implementation Status

### ✅ Completed

- ✅ RSS feed template created (`rss.xml`)
- ✅ Cloudflare Images integration for 1000x1500px images
- ✅ Media namespace for rich image metadata
- ✅ Proper XML structure (RSS 2.0)
- ✅ Image URL in `<media:content>` tag
- ✅ Fallback `<enclosure>` tag
- ✅ Collection-specific feeds (e.g., /animals/cats/)

### 📋 Required Manual Setup

- [ ] Claim website on Pinterest business account
- [ ] Add Pinterest verification meta tag to site
- [ ] Create Pinterest boards for each collection
- [ ] Connect RSS feeds to respective boards
- [ ] Configure Cloudflare Images variants (see CF_IMAGES_SETUP.md)
- [ ] Add CF Images account hash to `hugo.toml`

---

## Next Steps

### For You (Site Owner):

1. **Claim website on Pinterest**:
   - Add verification meta tag to `head.html`
   - Deploy updated site
   - Verify claim in Pinterest

2. **Create Pinterest boards**:
   - "Cat Coloring Pages"
   - "Dog Coloring Pages"
   - (Add more as you expand collections)

3. **Connect RSS feeds**:
   - Connect each collection's RSS feed to its board
   - Pinterest will start auto-publishing within 24 hours

4. **Generate content**:
   - Run `npm run generate 50` to create batch
   - Approve best images in dashboard
   - Build and deploy site

5. **Monitor results**:
   - Check Pinterest Analytics after 48-72 hours
   - Track impressions, saves, and clicks
   - Optimize based on performance

### Expected Results

**After 1 week**:
- 50+ Pins published automatically
- Impressions start appearing in analytics
- Initial traffic from Pinterest

**After 1 month**:
- 200+ Pins (assuming daily content)
- Established presence on Pinterest
- Measurable referral traffic
- Some Pins going viral (saves/repins)

---

## Support Resources

- [Pinterest RSS Auto-Publish Guide](https://help.pinterest.com/en/business/article/auto-publish-pins-with-rss-feeds)
- [Pinterest Image Specs](https://help.pinterest.com/en/business/article/pinterest-image-specifications)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Media RSS Specification](https://www.rssboard.org/media-rss)
- [Feed Validator](https://validator.w3.org/feed/)

---

## Summary

Your RSS feed is now **fully configured** for Pinterest auto-publishing:

✅ **Format**: RSS 2.0 (XML)  
✅ **Images**: 1000x1500px via `<media:content>`  
✅ **Structure**: All required tags present  
✅ **URLs**: Point to claimed domain  
✅ **Organization**: Collection-specific feeds  

**Manual setup required**: Claim website + connect feeds in Pinterest dashboard.

Once connected, every published coloring page will automatically become a Pin on Pinterest within 24 hours, driving traffic back to your site!

