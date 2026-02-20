#!/usr/bin/env node
/**
 * Convert a syllabus.json to .md and .docx formats.
 * Usage: npx tsx scripts/convert-syllabus.ts ./output/prejudice_v2/syllabus.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { buildSyllabusDocx } from './lib/docx-helpers';
import type { Syllabus } from '../src/types/course';

function formatSyllabusMd(syllabus: Syllabus): string {
  const lines: string[] = [];

  lines.push(`# ${syllabus.courseTitle}`, '');
  lines.push('## Course Overview', '');
  lines.push(syllabus.courseOverview, '');

  for (const ch of syllabus.chapters) {
    lines.push(`## Chapter ${ch.number}: ${ch.title}`, '');
    lines.push(ch.narrative, '');
    lines.push(`**Key Concepts:** ${ch.keyConcepts.join(', ')}`, '');

    if (ch.widgets.length > 0) {
      lines.push('### Interactive Widgets', '');
      for (const w of ch.widgets) {
        lines.push(`**${w.title}**`, '');
        lines.push(w.description, '');
        lines.push(`*Concept:* ${w.concept} | *Rationale:* ${w.rationale}`, '');
      }
    }

    if (ch.scienceAnnotations.length > 0) {
      lines.push('### Learning Science Annotations', '');
      for (const ann of ch.scienceAnnotations) {
        lines.push(`- **[${ann.principle}]** ${ann.description}`);
      }
      lines.push('');
    }

    if (ch.spacingConnections.length > 0) {
      lines.push(`*Spacing connections to chapters:* ${ch.spacingConnections.join(', ')}`, '');
    }

    lines.push('---', '');
  }

  return lines.join('\n');
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/convert-syllabus.ts <path/to/syllabus.json>');
    process.exit(1);
  }

  const raw = await readFile(inputPath, 'utf-8');
  const syllabus: Syllabus = JSON.parse(raw);
  const dir = dirname(inputPath);

  // Markdown
  const md = formatSyllabusMd(syllabus);
  const mdPath = join(dir, 'syllabus.md');
  await writeFile(mdPath, md);
  console.log(`Saved: ${mdPath}`);

  // DOCX
  const docxBuf = await buildSyllabusDocx(syllabus);
  const docxPath = join(dir, 'syllabus.docx');
  await writeFile(docxPath, docxBuf);
  console.log(`Saved: ${docxPath}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
