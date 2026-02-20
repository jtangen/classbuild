#!/usr/bin/env node
/**
 * One-off: generate ElevenLabs MP3 audiobooks for all chapters that have transcripts but no MP3.
 */
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { generateAudiobook } from '../src/services/elevenlabs/tts';

const execFileAsync = promisify(execFile);

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY environment variable is required');
  process.exit(1);
}

const OUTPUT_DIR = process.argv[2] || './output/raising-a-puppy';
const VOICE_ID = process.argv[3] || undefined; // uses default (Amelia) if not set
const AUDIO_DIR = join(OUTPUT_DIR, 'audio');

async function remuxMp3(rawPath: string): Promise<string> {
  const fixedPath = rawPath.replace(/\.mp3$/, '_fixed.mp3');
  try {
    await execFileAsync('ffmpeg', ['-y', '-i', rawPath, '-c', 'copy', fixedPath]);
    await unlink(rawPath);
    await rename(fixedPath, rawPath);
    return rawPath;
  } catch {
    console.log('  Warning: ffmpeg not available — MP3 duration metadata may be incorrect');
    try { await unlink(fixedPath); } catch { /* ignore */ }
    return rawPath;
  }
}

async function main() {
  const files = readdirSync(AUDIO_DIR)
    .filter((f: string) => f.endsWith('_transcript.md'))
    .sort();

  console.log(`Found ${files.length} transcripts in ${AUDIO_DIR}`);
  if (VOICE_ID) console.log(`Using voice ID: ${VOICE_ID}`);

  for (const file of files) {
    const prefix = file.replace('_transcript.md', '');
    const mp3Path = join(AUDIO_DIR, `${prefix}.mp3`);

    if (existsSync(mp3Path)) {
      console.log(`  ${prefix}: MP3 already exists, skipping`);
      continue;
    }

    const transcriptPath = join(AUDIO_DIR, file);
    const transcript = await readFile(transcriptPath, 'utf-8');

    console.log(`  ${prefix}: Generating audio (${transcript.length} chars)...`);
    try {
      const audioBlob = await generateAudiobook(transcript, ELEVENLABS_API_KEY, {
        voiceId: VOICE_ID,
        onProgress: (current, total) => process.stdout.write(`    chunk ${current}/${total}\r`),
      });
      console.log('');

      const arrayBuffer = await audioBlob.arrayBuffer();
      await writeFile(mp3Path, Buffer.from(arrayBuffer));
      await remuxMp3(mp3Path);
      console.log(`  ${prefix}: Saved ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`);
    } catch (err) {
      console.error(`  ${prefix}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
