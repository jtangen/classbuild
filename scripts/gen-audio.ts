#!/usr/bin/env node
/**
 * One-off: generate ElevenLabs audiobooks for every chapter that has a
 * transcript but no audio file yet. Native MP3 output — no transcoding step.
 *
 * Usage: ELEVENLABS_API_KEY=... npx tsx scripts/gen-audio.ts ./output/my-course [voiceId]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { generateAudiobook } from '../src/services/elevenLabs/tts';
import { getVoiceOption } from '../src/themes';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY environment variable is required');
  process.exit(1);
}

const OUTPUT_DIR = process.argv[2] || './output/raising-a-puppy';
const VOICE_ID = process.argv[3] || undefined;
const AUDIO_DIR = join(OUTPUT_DIR, 'audio');

async function main() {
  const files = readdirSync(AUDIO_DIR)
    .filter((f: string) => f.endsWith('_transcript.md'))
    .sort();

  console.log(`Found ${files.length} transcripts in ${AUDIO_DIR}`);
  if (VOICE_ID) console.log(`Using voice id: ${VOICE_ID}`);

  for (const file of files) {
    const prefix = file.replace('_transcript.md', '');
    const mp3Path = join(AUDIO_DIR, `${prefix}.mp3`);

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
      await writeFile(mp3Path, Buffer.from(arrayBuffer));
      const sizeMb = (arrayBuffer.byteLength / 1024 / 1024).toFixed(1);
      console.log(`  ${prefix}: Saved MP3 (${sizeMb} MB)`);
    } catch (err) {
      console.error(`  ${prefix}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
