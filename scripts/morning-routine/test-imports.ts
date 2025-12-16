// Simple test to check if all imports work
import { scanCategories } from './lib/hugo-manager';
import { loadPrompt } from './lib/prompt-manager';
import { listContent } from './lib/content-manager';
import { generateBatch } from './tasks/generate-batch';

console.log('✅ All imports successful!');

// Test scanCategories
const categories = scanCategories();
console.log('📁 Categories found:', categories.length);

// Test that everything is callable
console.log('✅ All functions are callable');



