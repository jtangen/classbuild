import { writeFile, rename, unlink } from 'node:fs/promises';

/**
 * Write via a temp file + rename, so an interrupted run never leaves a
 * truncated file at `filePath`. The render/audio scripts skip outputs that
 * already exist, so a partial file would otherwise be kept forever.
 */
export async function writeFileAtomic(filePath: string, data: string | Uint8Array): Promise<void> {
  const tmp = `${filePath}.${process.pid}.tmp`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, filePath);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}
