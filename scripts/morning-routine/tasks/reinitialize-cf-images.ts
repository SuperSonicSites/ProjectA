import fs from 'fs-extra';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from '../config/env';
import { uploadToCloudflareImages, getCFImageVariants } from '../lib/cf-images';
import { logger } from '../lib/logger';
import matter from 'gray-matter';

// Initialize S3 Client for Cloudflare R2
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${ENV.R2.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ENV.R2.ACCESS_KEY_ID,
        secretAccessKey: ENV.R2.SECRET_ACCESS_KEY
    }
});

interface FileResult {
    id: string;
    filename: string;
    status: 'success' | 'failed';
    cfImageId?: string;
    error?: string;
}

/**
 * Download file from R2
 */
async function downloadFromR2(filename: string): Promise<Buffer> {
    const key = `cats/${filename}`;
    try {
        logger.info(`Downloading from R2: ${key}`);
        
        const response = await R2.send(new GetObjectCommand({
            Bucket: ENV.R2.BUCKET_NAME,
            Key: key
        }));

        if (!response.Body) {
            throw new Error('No body in response');
        }

        // Handle streaming body from AWS SDK
        const data: any[] = [];
        for await (const chunk of response.Body as any) {
            data.push(chunk);
        }
        const buffer = Buffer.concat(data);
        logger.success(`Downloaded from R2: ${key} (${buffer.length} bytes)`);
        return buffer;
    } catch (error) {
        logger.error(`Failed to download from R2: ${key}`, error as Error);
        throw error;
    }
}

/**
 * Reinitialize Cloudflare images for existing markdown files
 */
export const reinitializeCFImages = async () => {
    logger.info('Starting Cloudflare Images reinitialization...');

    const contentDir = ENV.PATHS.CONTENT_DIR;
    const files = await fs.readdir(contentDir);
    const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'));

    const results: FileResult[] = [];

    for (const mdFile of mdFiles) {
        const mdPath = path.join(contentDir, mdFile);
        const baseFileName = mdFile.replace('.md', '');
        const pngFileName = `${baseFileName}.png`;

        try {
            logger.info(`Processing: ${mdFile}`);

            // 1. Read markdown file
            const mdContent = await fs.readFile(mdPath, 'utf-8');
            const { data: frontmatter, content } = matter(mdContent);

            // Skip if already has CF Image ID
            if (frontmatter.cf_image_id && frontmatter.cf_image_id.trim() !== '') {
                logger.info(`${mdFile} already has CF Image ID: ${frontmatter.cf_image_id}`);
                results.push({
                    id: baseFileName,
                    filename: mdFile,
                    status: 'success',
                    cfImageId: frontmatter.cf_image_id
                });
                continue;
            }

            // 2. Download PNG from R2
            const imageBuffer = await downloadFromR2(pngFileName);

            // 3. Upload to Cloudflare Images
            const cfImageId = await uploadToCloudflareImages(imageBuffer, pngFileName);

            // 4. Get CF Image variants
            const variants = getCFImageVariants(cfImageId);

            // 5. Update frontmatter
            frontmatter.cf_image_id = cfImageId;
            frontmatter.image_url = variants.desktop; // Use desktop variant for web display
            // Keep download_url and r2_original as is (R2 URLs)

            // 6. Rebuild markdown content
            const updatedMdContent = matter.stringify(content, frontmatter);
            await fs.writeFile(mdPath, updatedMdContent);

            logger.success(`${mdFile} updated with CF Image ID: ${cfImageId}`);
            results.push({
                id: baseFileName,
                filename: mdFile,
                status: 'success',
                cfImageId
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to process ${mdFile}`, error as Error);
            results.push({
                id: baseFileName,
                filename: mdFile,
                status: 'failed',
                error: errorMsg
            });
        }
    }

    logger.info('Reinitialization complete', {
        total: mdFiles.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length
    });

    return results;
};

// Allow direct execution
if (require.main === module) {
    reinitializeCFImages()
        .then(results => {
            logger.success('Reinitialization finished');
            console.log(JSON.stringify(results, null, 2));
            process.exit(0);
        })
        .catch(error => {
            logger.error('Reinitialization failed', error);
            process.exit(1);
        });
}

