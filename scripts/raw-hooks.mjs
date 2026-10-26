/**
 * Node module-loader hook (registered by raw-loader.mjs): makes Vite-style
 * `import css from './x.css?raw'` default-export the file's text, so the CLI
 * scripts can import src/ modules (src/themes/themes.config.ts uses ?raw).
 */
import { readFile } from 'node:fs/promises';

export async function load(url, context, nextLoad) {
  if (!url.endsWith('?raw')) return nextLoad(url, context);
  const source = await readFile(new URL(url.slice(0, -'?raw'.length)), 'utf8');
  return { format: 'module', source: `export default ${JSON.stringify(source)};`, shortCircuit: true };
}
