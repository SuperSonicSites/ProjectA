import fs from 'fs-extra';
import path from 'path';
import { logger } from '../lib/logger';

/**
 * Foreman: Production Schedule Task
 * 
 * Deterministically generates the daily matrix from the rollout schedule
 * and applies maintenance throttling rules.
 */

const SCHEDULE_PATH = path.resolve(__dirname, '../../../mission-control/rollout-schedule.md');
const CONTENT_PATH = path.resolve(__dirname, '../../../content');
const LOG_DIR = path.resolve(__dirname, '../../../mission-control/logs');

interface RolloutWeek {
  week_id: string;
  starts_at_et: string; // YYYY-MM-DD
  collections: string[];
  dry_run_collections: string[];
}

/**
 * Simple parser for the rollout-schedule.md file
 */
function parseSchedule(content: string): RolloutWeek[] {
  const weeks: RolloutWeek[] = [];
  const lines = content.split('\n');
  let currentWeek: Partial<RolloutWeek> | null = null;
  let currentType: 'collections' | 'dry_run_collections' | null = null;

  for (const line of lines) {
    const weekMatch = line.match(/^### (Week_\w+)/);
    if (weekMatch) {
      if (currentWeek) weeks.push(currentWeek as RolloutWeek);
      currentWeek = { week_id: weekMatch[1], collections: [], dry_run_collections: [] };
      continue;
    }

    if (!currentWeek) continue;

    const startAtMatch = line.match(/starts_at_et: ([\d-]+)/);
    if (startAtMatch) {
      currentWeek.starts_at_et = startAtMatch[1];
      continue;
    }

    if (line.includes('dry_run_collections:')) {
      currentType = 'dry_run_collections';
      continue;
    }

    if (line.includes('collections:')) {
      currentType = 'collections';
      continue;
    }

    // Match hyphens and lowercase in collection/category names; trim inline comments
    const itemMatch = line.match(/- ([-a-z0-9]+\/[-a-z0-9]+)/i);
    if (itemMatch && currentType) {
      const collPath = itemMatch[1].toLowerCase();
      if (currentType === 'collections') {
        currentWeek.collections?.push(collPath);
      } else {
        currentWeek.dry_run_collections?.push(collPath);
      }
    }
  }

  if (currentWeek) weeks.push(currentWeek as RolloutWeek);
  return weeks;
}

/**
 * Get current date in America/New_York as YYYY-MM-DD and day-of-week.
 * Uses Intl for deterministic timezone handling.
 */
function getETDateInfo(): { todayStr: string; isMonday: boolean } {
  let nowUTC = new Date();
  
  if (process.env.FORCE_DATE) {
    logger.info(`Foreman: FORCING DATE to ${process.env.FORCE_DATE}`);
    // Parse FORCE_DATE as ET date (e.g., "2025-12-22") → interpret as 5 AM ET
    const [year, month, day] = process.env.FORCE_DATE.split('-').map(Number);
    // Create a UTC date, then adjust: 5 AM ET = 10 AM UTC in winter
    nowUTC = new Date(Date.UTC(year, month - 1, day, 10, 0, 0));
  }

  // Format UTC time as ET using Intl (deterministic, locale-safe)
  const etFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  });
  
  const parts = etFormatter.formatToParts(nowUTC);
  const partMap: { [key: string]: string } = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const todayStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const isMonday = partMap.weekday === 'Monday';

  logger.info(`Foreman ET date: ${todayStr} (weekday: ${partMap.weekday})`);
  
  return { todayStr, isMonday };
}

/**
 * Count published (non-draft) pages in a collection
 */
function countPublishedPages(category: string, collection: string): number {
  const dir = path.join(CONTENT_PATH, category, collection);
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === '_index.md' || !file.endsWith('.md')) continue;
    
    // For now, we assume all .md files in content folders are intended to be counted 
    // unless Designer/Finisher has set them to draft. 
    // The PRD says "count only non-draft pages".
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      if (!content.includes('draft: true')) {
        count++;
      }
    } catch (e) {
      // Skip files we can't read
    }
  }
  return count;
}

async function run() {
  const { todayStr, isMonday } = getETDateInfo();

  logger.info(`Foreman checking schedule for: ${todayStr} (Monday: ${isMonday})`);

  if (!fs.existsSync(SCHEDULE_PATH)) {
    throw new Error(`Schedule file not found at ${SCHEDULE_PATH}`);
  }

  const scheduleContent = fs.readFileSync(SCHEDULE_PATH, 'utf8');
  const weeks = parseSchedule(scheduleContent);

  // Find the active week
  const activeWeek = weeks
    .filter(w => w.starts_at_et <= todayStr)
    .sort((a, b) => b.starts_at_et.localeCompare(a.starts_at_et))[0];

  if (!activeWeek) {
    logger.warn('No active week found in rollout schedule. Falling back to empty matrix.');
    console.log(JSON.stringify([]));
    return;
  }

  logger.info(`Active Week Identified: ${activeWeek.week_id} (started ${activeWeek.starts_at_et})`);

  const productionMatrix: string[] = [];
  const reportLines: string[] = [
    `# Foreman Scheduling Report: ${todayStr}`,
    `Active Week: **${activeWeek.week_id}**`,
    `Is Genesis Run (Monday): **${isMonday}**`,
    '',
    '| Collection | Count | Status | Decision |',
    '|---|---|---|---|'
  ];

  for (const collPath of activeWeek.collections) {
    const [category, collection] = collPath.split('/');
    const count = countPublishedPages(category, collection);
    const isOverCap = count >= 75;
    
    let decision = 'Daily (Uncapped)';
    let include = true;

    if (isOverCap) {
      if (isMonday) {
        decision = 'Genesis Run (Capped)';
        include = true;
      } else {
        decision = 'Skipped (Capped)';
        include = false;
      }
    }

    if (include) {
      productionMatrix.push(collPath);
    }

    reportLines.push(`| ${collPath} | ${count} | ${isOverCap ? '⚠️ Capped' : '✅ Active'} | ${decision} |`);
  }

  // Dry-run collections (always reported, never scheduled for production)
  if (activeWeek.dry_run_collections.length > 0) {
    reportLines.push('', '### Dry Run Collections (Foreman/Designer Only)');
    for (const collPath of activeWeek.dry_run_collections) {
      reportLines.push(`- ${collPath} (Dry-run)`);
    }
  }

  // Write Log
  const runId = process.env.GITHUB_RUN_ID || `local-${Date.now()}`;
  fs.ensureDirSync(LOG_DIR);
  fs.writeFileSync(path.join(LOG_DIR, `foreman-${runId}.md`), reportLines.join('\n'));

  // Output matrix for GHA
  const combinedMatrix = Array.from(new Set([...productionMatrix, ...activeWeek.dry_run_collections]));
  
  logger.info('Foreman Production Matrix:', JSON.stringify(productionMatrix));
  logger.info('Foreman Designer Matrix (includes dry-run):', JSON.stringify(combinedMatrix));
  
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify(productionMatrix)}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `designer_matrix=${JSON.stringify(combinedMatrix)}\n`);
  } else {
    // Fallback for local testing/logging
    console.log(`::set-output name=matrix::${JSON.stringify(productionMatrix)}`);
    console.log(`::set-output name=designer_matrix::${JSON.stringify(combinedMatrix)}`);
  }
  
  logger.success(`Foreman scheduled ${productionMatrix.length} production collections and ${combinedMatrix.length} total (inc. dry-run).`);
}

run().catch(err => {
  logger.error('Foreman failed', err);
  process.exit(1);
});
