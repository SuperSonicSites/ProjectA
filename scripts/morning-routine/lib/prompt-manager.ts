import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger';
import { getStyleById, getRandomStyle, getStyleByName, StyleDefinition } from '../config/styles';

const PROMPTS_DIR = path.resolve(__dirname, '../config/prompts');

export interface PromptConfig {
  collection: string;
  category: string;
  base: string;
  negative_prompt: string;
  medium?: string;
  attributes: {
    tones: string[];
    types: string[];
    actions: string[];
    settings: string[];
    details: string[];
    styles?: string[];
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
 * Format: A {tone} {type}, {action}, in {setting}. {detail}
 */
export function getRandomVariant(category: string, collection: string): string {
  const prompt = loadPrompt(category, collection);

  if (!prompt) {
    logger.warn(`Cannot generate variant - prompt not found: ${category}/${collection}`);
    return '';
  }

  const { tones, types, actions, settings, details } = prompt.attributes;

  const randomTone = tones.length > 0 ? tones[Math.floor(Math.random() * tones.length)] : '';
  const randomType = types.length > 0 ? types[Math.floor(Math.random() * types.length)] : collection;
  const randomAction = actions.length > 0 ? actions[Math.floor(Math.random() * actions.length)] : '';
  const randomSetting = settings.length > 0 ? settings[Math.floor(Math.random() * settings.length)] : '';
  const randomDetail = (details && details.length > 0) ? details[Math.floor(Math.random() * details.length)] : '';

  let variant = `A ${randomTone} ${randomType}`.replace(/\s+/g, ' ').trim();
  if (randomAction) variant += `, ${randomAction}`;
  if (randomSetting) variant += `, in ${randomSetting}`;
  if (randomDetail) variant += `. ${randomDetail}`;

  return variant.trim();
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
- ASPECT RATIO: 3:4 portrait orientation. TALL vertical format in 2K resolution.
- OUTLINES ONLY: Use ONLY black outlines to define shapes. NO filled black areas. NO solid black shapes.
- ALL AREAS MUST BE COLORABLE: Every part of the image should be an empty space inside black outlines.
- Background: Pure white (#FFFFFF). NO shading, NO gradients, NO gray tones.
- NO BORDERS: Do not include any frames, decorative borders, or boxed edges around the image.

VISUAL QUALITY:
- LINES: Thick, uniform, consistent line weight (4-6px). Solid black outlines only.
- PROPORTIONS: Perfect anatomical proportions. Cute but structurally correct.
- COMPOSITION: Centered, balanced, with maximum negative space for coloring.

CONTENT:
- SUBJECT: A cute, cozy ${collection}.
- NO FILLED AREAS: Everything must be outlined, nothing filled with black or gray.

ATMOSPHERE: Whimsical, inviting, clean line art ready for coloring.`,
    negative_prompt:
      'border, frame, framed, boxed, edges, decorative border, ornate frame, die cut, contour, margin line, sticker edge, transparent background, transparency, color, shading, gray, gradient, photo, realistic, 3d, rendering, text, signature, watermark, blurry, broken lines, thin lines, sketch, messy, horizontal orientation, landscape, filled areas, solid colors',
    attributes: {
      tones: ['Cozy', 'Playful', 'Sleepy', 'Adventurous', 'Elegant', 'Curious', 'Grumpy', 'Zen'],
      types: [],
      actions: ['baking', 'napping', 'reading', 'painting', 'dancing'],
      settings: ['home', 'garden', 'library', 'kitchen', 'studio'],
      details: [],
      styles: ['Kawaii', 'Cottagecore', 'Totem', 'Bold Line Pop Art', 'Magical Realism']
    }
  };

  savePrompt(category, collection, config);
  return config;
}

/**
 * Build full prompt with style modifier
 * Randomly selects a style from the prompt config's styles array, or uses random if none specified
 * @param category - Category name (e.g., "animals")
 * @param collection - Collection name (e.g., "cats")
 * @param variantPrompt - The scene/variant prompt (e.g., "Sleepy Cat napping")
 * @returns Object with fullPrompt, style definition, and negative_prompt
 */
export function buildPromptWithStyle(
  category: string,
  collection: string,
  variantPrompt: string
): { fullPrompt: string; style: StyleDefinition; negative_prompt: string } {
  const promptConfig = loadPrompt(category, collection);
  
  if (!promptConfig) {
    throw new Error(`Prompt not found for collection: ${category}/${collection}`);
  }

  let style: StyleDefinition | null = null;

  // Check if styles array exists and has values
  const styles = promptConfig.attributes.styles || [];
  
  if (styles.length > 0) {
    // Randomly pick from the styles array
    const randomStyleName = styles[Math.floor(Math.random() * styles.length)];
    style = getStyleByName(randomStyleName);
    
    if (!style) {
      logger.warn(`Style not found in config: ${randomStyleName}, using random style`);
      style = getRandomStyle();
    }
  } else {
    // No styles specified in config, pick random from all available
    style = getRandomStyle();
  }

  // Inject style modifier into base prompt
  const styledBase = `${promptConfig.base}\n\nSTYLE MODIFIER: ${style.promptModifier}\n\nCRITICAL ENFORCEMENT: NO BORDERS, NO FRAMES, NO EDGES. The art must exist freely on the white background without any containing box or boundary lines.`;
  const fullPrompt = `${styledBase}\n\nSCENE: ${variantPrompt}, aspectRatio = "3:4", Resolution: "4K", 3:4 aspect ratio, high-resolution 4K detail`;

  return {
    fullPrompt,
    style,
    negative_prompt: promptConfig.negative_prompt
  };
}

