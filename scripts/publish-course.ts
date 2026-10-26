#!/usr/bin/env node
/**
 * Standalone publish script — re-assemble the publish/ package
 * from an existing output directory without regenerating anything.
 *
 * Usage:
 *   npx tsx --import ./scripts/raw-loader.mjs scripts/publish-course.ts ./output/prejudice_v2 --theme press
 */

import { parseArgs } from 'node:util';
import { assemblePublishPackage } from './lib/publish';
import { DEFAULT_CHAPTER_THEME_ID } from '../src/themes';

const { values, positionals } = parseArgs({
  options: {
    theme: { type: 'string', default: DEFAULT_CHAPTER_THEME_ID },
  },
  allowPositionals: true,
  strict: true,
});

const outputDir = positionals[0];

if (!outputDir) {
  console.error(`Usage: npx tsx --import ./scripts/raw-loader.mjs scripts/publish-course.ts <output-dir> [--theme ${DEFAULT_CHAPTER_THEME_ID}]`);
  console.error('');
  console.error('Assembles a static publish/ website from existing CLI output.');
  process.exit(1);
}

async function main() {
  console.log(`Publishing from: ${outputDir}`);
  console.log(`Theme: ${values.theme}`);
  console.log('');

  const { publishDir } = await assemblePublishPackage(outputDir, values.theme);
  console.log('');
  console.log(`Done! Open ${publishDir}/index.html in a browser to preview.`);
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
