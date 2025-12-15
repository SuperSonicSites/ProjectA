import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger';

const PROMPTS_DIR = path.resolve(__dirname, '../config/prompts');

export interface PromptConfig {
  collection: string;
  category: string;
  base: string;
  negative_prompt: string;
  attributes: {
    tones: string[];
    types: string[];
    actions: string[];
    settings: string[];
    details: string[];
  };
}

/**
 * Load prompt config for a collection
 */
export function loadPrompt(category: string, collection: string): PromptConfig | null {
  try {
    fs.ensureDirSync(PROMPTS_DIR);
    const promptPath = path.join(PROMPTS_DIR, `${category}-${collection}.json`);

    console.log(`[loadPrompt] Looking for: ${promptPath}`);
    console.log(`[loadPrompt] PROMPTS_DIR: ${PROMPTS_DIR}`);
    console.log(`[loadPrompt] Exists: ${fs.existsSync(promptPath)}`);

    if (!fs.existsSync(promptPath)) {
      // Try case-insensitive search
      const files = fs.readdirSync(PROMPTS_DIR);
      console.log(`[loadPrompt] Files in directory:`, files);
      const searchName = `${category}-${collection}.json`.toLowerCase();
      console.log(`[loadPrompt] Searching for (lowercase):`, searchName);
      const matchingFile = files.find(f => f.toLowerCase() === searchName);
      console.log(`[loadPrompt] Found matching file:`, matchingFile);

      if (!matchingFile) {
        logger.warn(`Prompt not found: ${category}/${collection}`);
        return null;
      }

      const content = fs.readFileSync(path.join(PROMPTS_DIR, matchingFile), 'utf8');
      const config = JSON.parse(content) as PromptConfig;
      return config;
    }

    const content = fs.readFileSync(promptPath, 'utf8');
    const config = JSON.parse(content) as PromptConfig;
    return config;
  } catch (error) {
    logger.error(`Error loading prompt ${category}/${collection}`, error as Error);
    return null;
  }
}

/**
 * Save prompt config for a collection
 */
export function savePrompt(
  category: string,
  collection: string,
  config: PromptConfig
): void {
  try {
    fs.ensureDirSync(PROMPTS_DIR);
    const promptPath = path.join(PROMPTS_DIR, `${category}-${collection}.json`);

    fs.writeFileSync(promptPath, JSON.stringify(config, null, 2), 'utf8');
    logger.success(`Saved prompt: ${category}/${collection}`);
  } catch (error) {
    logger.error(`Error saving prompt ${category}/${collection}`, error as Error);
    throw error;
  }
}

/**
 * Generate random variant from prompt attributes
 * Format: {tone} {type} in a {setting} {action}
 */
export function getRandomVariant(category: string, collection: string): string {
  const prompt = loadPrompt(category, collection);

  if (!prompt) {
    logger.warn(`Cannot generate variant - prompt not found: ${category}/${collection}`);
    return '';
  }

  const { tones, types, actions, settings } = prompt.attributes;

  const randomTone = tones[Math.floor(Math.random() * tones.length)];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  const randomSetting = settings[Math.floor(Math.random() * settings.length)];

  return `${randomTone} ${randomType} in a ${randomSetting} ${randomAction}`;
}

/**
 * List all available prompts
 */
export function listAllPrompts(): Array<{ category: string; collection: string }> {
  try {
    if (!fs.existsSync(PROMPTS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(PROMPTS_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const name = f.replace('.json', '');
        const parts = name.split('-');
        const collection = parts.pop() || '';
        const category = parts.join('-');
        return { category, collection };
      });
  } catch (error) {
    logger.error('Error listing prompts', error as Error);
    return [];
  }
}

/**
 * Create default prompt for a new collection
 */
export function createDefaultPrompt(
  category: string,
  collection: string
): PromptConfig {
  const config: PromptConfig = {
    collection,
    category,
    base: `TYPE: Black and white line art coloring page - OUTLINES ONLY.
STYLE: Clean vector illustration, children's book style.

CRITICAL REQUIREMENTS FOR COLORING PAGES:
- OUTLINES ONLY: Use ONLY black outlines to define shapes. NO filled black areas. NO solid black shapes.
- ALL AREAS MUST BE COLORABLE: Every part of the image should be an empty space inside black outlines.
- Background: Pure white (#FFFFFF). NO shading, NO gradients, NO gray tones.

VISUAL QUALITY:
- LINES: Thick, uniform, consistent line weight (4-6px). Solid black outlines only.
- PROPORTIONS: Perfect anatomical proportions. Cute but structurally correct.
- COMPOSITION: Centered, balanced, with maximum negative space for coloring.

CONTENT:
- SUBJECT: A cute, cozy ${collection.slice(0, -1)}.
- NO FILLED AREAS: Everything must be outlined, nothing filled with black or gray.

ATMOSPHERE: Whimsical, inviting, clean line art ready for coloring.`,
    negative_prompt:
      'transparent background, transparency, color, shading, gray, gradient, photo, realistic, 3d, rendering, text, signature, watermark, blurry, broken lines, thin lines, sketch, messy, horizontal orientation, landscape, filled areas, solid colors',
    attributes: {
      tones: ['Cozy', 'Playful', 'Sleepy', 'Adventurous', 'Elegant', 'Curious', 'Grumpy', 'Zen'],
      types: [],
      actions: ['baking', 'napping', 'reading', 'painting', 'dancing'],
      settings: ['home', 'garden', 'library', 'kitchen', 'studio'],
      details: []
    }
  };

  savePrompt(category, collection, config);
  return config;
}

