import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also load .dev.vars for local secrets
dotenv.config({ path: path.resolve(__dirname, '../.dev.vars') });

const required = [
  'RECRAFT_API_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY'
];

const cfImagesRequired = [
  'CF_IMAGES_ACCOUNT_ID',
  'CF_IMAGES_API_TOKEN',
  'CF_IMAGES_ACCOUNT_HASH'
];

let missing: string[] = [];
let missingCFImages: string[] = [];

console.log('🔍 Validating environment variables...\n');

for (const key of required) {
  if (!process.env[key]) {
    missing.push(key);
  } else {
    console.log(`✅ ${key} is configured`);
  }
}

console.log('\n📸 Cloudflare Images configuration (optional for web delivery):\n');
for (const key of cfImagesRequired) {
  if (!process.env[key]) {
    missingCFImages.push(key);
    console.log(`⚠️  ${key} is not configured`);
  } else {
    console.log(`✅ ${key} is configured`);
  }
}

console.log('\n');

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables:\n   ${missing.join('\n   ')}`);
  console.error('\n📝 Please set these in your .env file. Use .env.example as a template.\n');
  process.exit(1);
}

if (missingCFImages.length > 0) {
  console.warn(`⚠️  Missing Cloudflare Images variables. Web image optimization disabled.`);
  console.warn(`   Images will fall back to R2 direct delivery.\n`);
}

console.log('✅ Environment validation passed!\n');
process.exit(0);

