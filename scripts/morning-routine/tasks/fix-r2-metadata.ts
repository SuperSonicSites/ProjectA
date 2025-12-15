import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../config/env';
import { logger } from '../lib/logger';

// Initialize S3 Client for Cloudflare R2
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${ENV.R2.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ENV.R2.ACCESS_KEY_ID,
        secretAccessKey: ENV.R2.SECRET_ACCESS_KEY
    }
});

/**
 * Fix R2 metadata for existing files
 * Adds ContentDisposition header to force downloads
 */
const fixR2Metadata = async () => {
    const files = [
        'cats/cat-1765793984470-0.png',
        'cats/cat-1765795054808-0.png',
        'cats/cat-1765795079365-1.png',
        'cats/cat-1765795104088-2.png',
        'cats/cat-1765795127292-3.png',
        'cats/cat-1765795150538-4.png'
    ];

    logger.info(`Fixing metadata for ${files.length} files...`);

    for (const key of files) {
        const filename = key.split('/').pop() || key;
        
        try {
            // Get current metadata
            logger.info(`[${key}] Checking current metadata...`);
            const headResult = await R2.send(new HeadObjectCommand({
                Bucket: ENV.R2.BUCKET_NAME,
                Key: key
            }));

            // Copy object to itself with new metadata (this updates the metadata)
            logger.info(`[${key}] Updating ContentDisposition header...`);
            await R2.send(new CopyObjectCommand({
                Bucket: ENV.R2.BUCKET_NAME,
                CopySource: `${ENV.R2.BUCKET_NAME}/${key}`,
                Key: key,
                ContentType: headResult.ContentType || 'image/png',
                ContentDisposition: `attachment; filename="${filename}"`,
                MetadataDirective: 'REPLACE'
            }));

            logger.success(`[${key}] ✅ Metadata updated successfully`);
        } catch (error) {
            logger.error(`[${key}] ❌ Failed to update metadata`, error as Error);
        }
    }

    logger.success('Metadata fix complete!');
};

// Run the fix
if (require.main === module) {
    fixR2Metadata()
        .then(() => {
            logger.success('All files processed');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Fix failed', error);
            process.exit(1);
        });
}

export { fixR2Metadata };

