#!/usr/bin/env node
/**
 * Standalone publish script — re-assemble the publish/ package
 * from an existing output directory without regenerating anything.
 *
 * Usage:
 *   npx tsx scripts/publish-course.ts ./output/prejudice_v2 --theme midnight
 */

import { parseArgs } from 'node:util';
import { assemblePublishPackage } from './lib/publish';

const { values, positionals } = parseArgs({
  options: {
    theme: { type: 'string', default: 'midnight' },
  },
  allowPositionals: true,
  strict: true,
});

const outputDir = positionals[0];

if (!outputDir) {
  console.error('Usage: npx tsx scripts/publish-course.ts <output-dir> [--theme midnight]');
  console.error('');
  console.error('Assembles a static publish/ website from existing CLI output.');
  process.exit(1);
}

async function main() {
  console.log(`Publishing from: ${outputDir}`);
  console.log(`Theme: ${values.theme}`);
  console.log('');

  const publishDir = await assemblePublishPackage(outputDir, values.theme);
  console.log('');
  console.log(`Done! Open ${publishDir}/index.html in a browser to preview.`);
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
