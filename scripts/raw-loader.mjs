/**
 * Preload for the CLI scripts. src/ imports theme CSS with Vite's `?raw`
 * suffix, which plain Node/tsx can't load (ERR_UNKNOWN_FILE_EXTENSION ".css").
 * Run every script with it:
 *
 *   npx tsx --env-file=.env.local --import ./scripts/raw-loader.mjs scripts/<name>.ts …
 *
 * (--env-file=.env.local is only needed by scripts that read API keys.)
 */
import { register } from 'node:module';

register('./raw-hooks.mjs', import.meta.url);
