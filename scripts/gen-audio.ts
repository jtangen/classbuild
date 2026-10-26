#!/usr/bin/env node
/**
 * Generate ElevenLabs audiobooks for every chapter that has a transcript but
 * no audio file yet. Native MP3 output — no transcoding step.
 *
 * Usage:
 *   npx tsx --env-file=.env.local --import ./scripts/raw-loader.mjs scripts/gen-audio.ts ./output/my-course [voiceId]
 *
 * ELEVENLABS_API_KEY comes from .env.local. The exit code is 1 if any chapter failed.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { generateAudiobook } from '../src/services/elevenLabs/tts';
import { getVoiceOption } from '../src/themes';
import { writeFileAtomic } from './lib/write-atomic';

// No default course: synthesis is paid, so the target must be explicit.
const OUTPUT_DIR = process.argv[2];
if (!OUTPUT_DIR) {
  console.error('Usage: npx tsx --env-file=.env.local --import ./scripts/raw-loader.mjs scripts/gen-audio.ts <course-output-dir> [voiceId]');
  process.exit(2);
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY is required. Put it in .env.local and run with --env-file=.env.local');
  process.exit(1);
}

const VOICE_ID = process.argv[3] || undefined;
const AUDIO_DIR = join(OUTPUT_DIR, 'audio');

async function main() {
  const files = readdirSync(AUDIO_DIR)
    .filter((f: string) => f.endsWith('_transcript.md'))
    .sort();

  console.log(`Found ${files.length} transcripts in ${AUDIO_DIR}`);
  if (VOICE_ID) console.log(`Using voice id: ${VOICE_ID}`);

  let failed = 0;
  for (const file of files) {
    const prefix = file.replace('_transcript.md', '');
    const mp3Path = join(AUDIO_DIR, `${prefix}.mp3`);

    // MP3s are written via temp file + rename, so an existing one is complete.
    if (existsSync(mp3Path)) {
      console.log(`  ${prefix}: audio already exists, skipping`);
      continue;
    }

    const transcriptPath = join(AUDIO_DIR, file);
    const transcript = await readFile(transcriptPath, 'utf-8');

    console.log(`  ${prefix}: Generating audio (${transcript.length} chars)...`);
    try {
      const voice = getVoiceOption(VOICE_ID);
      const audioBlob = await generateAudiobook(transcript, ELEVENLABS_API_KEY!, {
        voiceId: voice.id,
        onProgress: (current, total) =>
          process.stdout.write(`    chunk ${current}/${total}\r`),
      });
      console.log('');

      const arrayBuffer = await audioBlob.arrayBuffer();
      await writeFileAtomic(mp3Path, Buffer.from(arrayBuffer));
      const sizeMb = (arrayBuffer.byteLength / 1024 / 1024).toFixed(1);
      console.log(`  ${prefix}: Saved MP3 (${sizeMb} MB)`);
    } catch (err) {
      failed++;
      console.error(`  ${prefix}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (failed > 0) {
    console.error(`${failed} chapter(s) failed; re-run to retry them.`);
    process.exitCode = 1;
    return;
  }
  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
