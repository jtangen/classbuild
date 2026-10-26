#!/usr/bin/env node
/**
 * Package a weekly challenge HTML file into a SCORM 2004 4th Edition ZIP
 * for upload to Blackboard Ultra (or any SCORM-compliant LMS).
 *
 * Usage:
 *   npx tsx --import ./scripts/raw-loader.mjs scripts/package-scorm.ts \
 *     --input output/test-challenge.html \
 *     --output output/weekly-challenge-scorm.zip
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { dirname, basename } from 'node:path';
import JSZip from 'jszip';

/* ------------------------------------------------------------------ */
/*  CLI args                                                          */
/* ------------------------------------------------------------------ */

const { values } = parseArgs({
  options: {
    input:  { type: 'string', short: 'i' },
    output: { type: 'string', short: 'o' },
  },
  strict: true,
});

if (!values.input || !values.output) {
  console.error('Usage: npx tsx --import ./scripts/raw-loader.mjs scripts/package-scorm.ts --input <file.html> --output <package.zip>');
  process.exit(1);
}

const inputPath  = values.input;
const outputPath = values.output;

/* ------------------------------------------------------------------ */
/*  Read HTML & extract title                                         */
/* ------------------------------------------------------------------ */

const html = await readFile(inputPath, 'utf-8');

const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
const title = titleMatch ? titleMatch[1].trim() : basename(inputPath, '.html');

const launchFile = basename(inputPath);

console.log(`Title:  ${title}`);
console.log(`Launch: ${launchFile}`);

/* ------------------------------------------------------------------ */
/*  imsmanifest.xml — SCORM 2004 4th Edition                         */
/* ------------------------------------------------------------------ */

const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="classbuild-scorm-pkg"
          version="1.0"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
          xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
          xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
          xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                              http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                              http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                              http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
                              http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>

  <organizations default="org-1">
    <organization identifier="org-1">
      <title>${escapeXml(title)}</title>
      <item identifier="item-1" identifierref="res-1">
        <title>${escapeXml(title)}</title>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="res-1"
              type="webcontent"
              adlcp:scormType="sco"
              href="${escapeXml(launchFile)}">
      <file href="${escapeXml(launchFile)}" />
    </resource>
  </resources>

</manifest>
`;

/* ------------------------------------------------------------------ */
/*  Build ZIP                                                         */
/* ------------------------------------------------------------------ */

const zip = new JSZip();
zip.file('imsmanifest.xml', manifest);
zip.file(launchFile, html);

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, buf);

console.log(`SCORM package written to ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`);

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
