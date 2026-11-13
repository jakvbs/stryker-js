import { createRequire } from 'module';
import { pathToFileURL } from 'node:url';
import path from 'path';
import type { createVitest as CreateVitest } from 'vitest/node';

// Load the project's own Vitest and only fall back to ours when it has none. A static import of our copy would load a
// second Vite beside the project's, which fails under Bun before the project's copy is ever reached.
// Babel, which the instrumenter loads into this process, installs a global `Error.prepareStackTrace`; Bun then rejects
// the `Error.captureStackTrace` calls Vite makes on plain objects while loading, so Vitest loads without it.
let createVitest: typeof CreateVitest;
let version: string;
const prepareStackTrace = Error.prepareStackTrace;
Object.assign(Error, { prepareStackTrace: undefined });

try {
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  const vitestNode = await import(
    pathToFileURL(require.resolve('vitest/node')).href
  );
  createVitest = vitestNode.createVitest;
  version = require(require.resolve('vitest/package.json')).version;
} catch {
  const require = createRequire(import.meta.url);
  createVitest = (await import('vitest/node')).createVitest;
  version = require(require.resolve('vitest/package.json')).version;
} finally {
  Error.prepareStackTrace = prepareStackTrace;
}

export const vitestWrapper = {
  createVitest,
  version,
};

export type * from 'vitest/node';
