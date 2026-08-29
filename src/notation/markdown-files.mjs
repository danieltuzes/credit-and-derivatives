import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const compareCodeUnits = (left, right) =>
  left < right ? -1 : left > right ? 1 : 0;

/**
 * Return every Markdown file below a directory in a stable order.
 *
 * Directories and non-Markdown files are excluded. Symbolic links are not
 * followed, which keeps discovery bounded by the authored content tree.
 *
 * @param {string} directory
 * @returns {string[]}
 */
export function markdownFilesBelow(directory) {
  const paths = readdirSync(directory, { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return markdownFilesBelow(path);
      return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
    },
  );

  return paths.sort(compareCodeUnits);
}
