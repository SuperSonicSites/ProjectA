import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../config/env';
import { uploadToCloudflareImages, getCFImageVariants, deleteFromCloudflareImages } from './cf-images';

// Initialize S3 Client for Cloudflare R2
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${ENV.R2.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ENV.R2.ACCESS_KEY_ID,
        secretAccessKey: ENV.R2.SECRET_ACCESS_KEY
    }
});

export interface UploadResult {
    r2Url: string;              // Original PNG in R2 for backup
    cfImageId: string;          // Cloudflare Images ID
    imageUrl: string;           // Web preview URL (CF Images desktop variant)
    downloadUrl: string;        // R2 PDF download URL
    variants: {
        desktop: string;        // 1200x1600 - Desktop web preview
        mobile: string;         // 600x800 - Mobile web preview
        thumbnail: string;      // 300x400 - Grid/masonry thumbnails
        rss: string;            // 1125x1500 - RSS feeds (3:4 ratio)
        pinterest: string;      // 1000x1500 - Pinterest/og:image (2:3 ratio)
    };
}

export const uploadImage = async (buffer: Buffer, filename: string, collection?: string): Promise<UploadResult> => {
    // Extract collection from filename if not provided (e.g., "sleepy-cat-coloring-page-1234.png" -> "cats")
    const collectionFolder = collection || filename.match(/-([a-z]+)-coloring-page-/)?.[1] + 's' || 'cats';
    const key = `${collectionFolder}/${filename}`; // Organize in collection folder in bucket

    try {
        // 1. Upload original PNG to R2 (backup + archive)
        console.log(`[R2] Uploading PNG ${key}...`);
        await R2.send(new PutObjectCommand({
            Bucket: ENV.R2.BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: 'image/png', // PNG from Recraft
            ContentDisposition: `attachment; filename="${filename}"` // Force download instead of inline display
        }));

        const r2Url = `${ENV.R2.PUBLIC_URL_BASE}/${key}`;
        console.log(`[R2] ✅ PNG stored at ${r2Url}`);

        // 2. Upload to Cloudflare Images for web delivery (if configured)
        let cfImageId = '';
        let imageUrl = r2Url; // Fallback to R2
        let variants = {
            desktop: r2Url,
            mobile: r2Url,
            thumbnail: r2Url,
            rss: r2Url,
            pinterest: r2Url
        };

        if (ENV.CF_IMAGES.ACCOUNT_ID && ENV.CF_IMAGES.API_TOKEN) {
            try {
                cfImageId = await uploadToCloudflareImages(buffer, filename);
                const cfVariants = getCFImageVariants(cfImageId);
                imageUrl = cfVariants.desktop;
                variants = cfVariants;
                console.log(`[Upload] ✅ CF Images configured for web delivery`);
            } catch (cfError) {
                console.warn(`[Upload] ⚠️ CF Images upload failed, falling back to R2:`, cfError);
                cfImageId = ''; // Mark as failed but continue
            }
        } else {
            console.log(`[Upload] ℹ️ CF Images not configured, using R2 direct delivery`);
        }

        // 3. Generate PDF download URL (stored separately)
        const pdfKey = key.replace('.png', '.pdf');
        const downloadUrl = `${ENV.R2.PUBLIC_URL_BASE}/${pdfKey}`;

        return {
            r2Url,
            cfImageId,
            imageUrl,
            downloadUrl,
            variants
        };
    } catch (error) {
        console.error(`[R2] Upload Failed for ${key}:`, error);
        throw error;
    }
};

export const deleteImage = async (filename: string, cfImageId?: string, collection?: string): Promise<void> => {
    // Extract collection from filename if not provided
    const collectionFolder = collection || filename.match(/-([a-z]+)-coloring-page-/)?.[1] + 's' || 'cats';
    const key = `${collectionFolder}/${filename}`;
    
    try {
        // 1. Delete from R2 storage
        console.log(`[R2] Attempting to delete: ${key}`);
        await R2.send(new DeleteObjectCommand({
            Bucket: ENV.R2.BUCKET_NAME,
            Key: key
        }));
        console.log(`[R2] ✅ Successfully deleted ${key}`);
        
        // 2. Delete from Cloudflare Images if ID provided
        if (cfImageId) {
            console.log(`[CF Images] Deleting image ID: ${cfImageId}`);
            await deleteFromCloudflareImages(cfImageId);
        }
        
    } catch (error) {
        console.error(`[R2] ❌ Delete failed for ${key}:`, error);
        throw error; // Propagate so dashboard knows it failed
    }
};
