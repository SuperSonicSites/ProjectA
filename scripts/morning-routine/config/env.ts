import dotenv from 'dotenv';
import path from 'path';

// Load .dev.vars from project root for local development
// For Cloudflare Pages deployment, secrets are set via: wrangler pages secret put <NAME>
dotenv.config({ path: path.resolve(__dirname, '../../../.dev.vars') });

export const ENV = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: 'gemini-2.5-flash-image',

    R2: {
        ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
        ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
        SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
        BUCKET_NAME: process.env.R2_BUCKET_NAME || 'paperpause',
        PUBLIC_URL_BASE: process.env.R2_PUBLIC_URL || 'https://img.paperpause.app'
    },

    CF_IMAGES: {
        ACCOUNT_ID: process.env.CF_IMAGES_ACCOUNT_ID || '',
        API_TOKEN: process.env.CF_IMAGES_API_TOKEN || '',
        ACCOUNT_HASH: process.env.CF_IMAGES_ACCOUNT_HASH || '', // For delivery URLs
    },

    PATHS: {
        CONTENT_DIR: path.resolve(__dirname, '../../../content'),
        DASHBOARD_PORT: parseInt(process.env.DASHBOARD_PORT || '3000', 10)
    }
};

// Validate required secrets and provide helpful error messages
if (!ENV.GEMINI_API_KEY) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is missing in .dev.vars");
    console.warn("    Create .dev.vars from .dev.vars.example and fill in your API keys");
}

const missingR2Creds = !ENV.R2.ACCOUNT_ID || !ENV.R2.ACCESS_KEY_ID || !ENV.R2.SECRET_ACCESS_KEY;
if (missingR2Creds) {
    console.warn("⚠️  WARNING: R2 credentials are incomplete in .dev.vars");
    console.warn("    Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY to .dev.vars");
}
