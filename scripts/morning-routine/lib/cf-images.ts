import { ENV } from '../config/env';

/**
 * Upload an image to Cloudflare Images
 * @param buffer - Image buffer
 * @param filename - Original filename for tracking
 * @returns Cloudflare Images ID
 */
export async function uploadToCloudflareImages(
  buffer: Buffer,
  filename: string
): Promise<string> {
  // Check if CF Images is configured
  if (!ENV.CF_IMAGES.ACCOUNT_ID || !ENV.CF_IMAGES.API_TOKEN) {
    throw new Error(
      'Cloudflare Images not configured. Set CF_IMAGES_ACCOUNT_ID and CF_IMAGES_API_TOKEN in .env'
    );
  }

  // Convert buffer to blob for FormData
  const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, filename);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ENV.CF_IMAGES.ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.CF_IMAGES.API_TOKEN}`
        },
        body: formData
      }
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(
        `CF Images upload failed: ${result.errors?.[0]?.message || 'Unknown error'}`
      );
    }

    console.log(`[CF Images] ✅ Uploaded: ${filename} → ${result.result.id}`);
    return result.result.id;
  } catch (error) {
    console.error(`[CF Images] ❌ Upload failed for ${filename}:`, error);
    throw error;
  }
}

/**
 * Generate Cloudflare Images delivery URL with variant
 * @param imageId - Cloudflare Images ID
 * @param variant - Image variant (public, mobile, thumbnail, pinterest, preview-small)
 * @returns Full delivery URL
 */
export function getCFImageUrl(imageId: string, variant: string = 'public'): string {
  if (!ENV.CF_IMAGES.ACCOUNT_HASH) {
    throw new Error('CF_IMAGES_ACCOUNT_HASH not configured in .env');
  }
  return `https://imagedelivery.net/${ENV.CF_IMAGES.ACCOUNT_HASH}/${imageId}/${variant}`;
}

/**
 * Get all variant URLs for an image
 */
export function getCFImageVariants(imageId: string) {
  return {
    desktop: getCFImageUrl(imageId, 'desktop'),      // 1200x1600 - Desktop display
    mobile: getCFImageUrl(imageId, 'mobile'),        // 600x800 - Mobile display
    thumbnail: getCFImageUrl(imageId, 'thumbnail'),  // 300x400 - Grid previews
    rss: getCFImageUrl(imageId, 'rss'),             // 1125x1500 - RSS feeds (3:4 ratio)
    pinterest: getCFImageUrl(imageId, 'pinterest')   // 1000x1500 - Pinterest/social (2:3 ratio)
  };
}

/**
 * Delete an image from Cloudflare Images
 * @param imageId - Cloudflare Images ID to delete
 */
export async function deleteFromCloudflareImages(imageId: string): Promise<void> {
  // Check if CF Images is configured
  if (!ENV.CF_IMAGES.ACCOUNT_ID || !ENV.CF_IMAGES.API_TOKEN) {
    throw new Error(
      'Cloudflare Images not configured. Set CF_IMAGES_ACCOUNT_ID and CF_IMAGES_API_TOKEN in .env'
    );
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ENV.CF_IMAGES.ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${ENV.CF_IMAGES.API_TOKEN}`
        }
      }
    );

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(
        `CF Images deletion failed: ${result.errors?.[0]?.message || 'Unknown error'}`
      );
    }

    console.log(`[CF Images] ✅ Deleted image ID: ${imageId}`);
  } catch (error) {
    console.error(`[CF Images] ❌ Deletion failed for ${imageId}:`, error);
    throw error;
  }
}

