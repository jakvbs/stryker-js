// Packs the packages Legible installs from this fork into tarballs for a GitHub release.
// Usage: node .github/legible/pack.mjs <tag> <owner/repo> <out-dir>
// A package's dependency on another packed package points at that package's tarball in the same release, so Legible
// lists only the packages it imports and never mixes in an upstream copy from npm. Packages must be built first.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [tag, repo, outDir] = process.argv.slice(2);
if (!tag || !repo || !outDir) {
  throw new Error('Usage: pack.mjs <tag> <owner/repo> <out-dir>');
}

const packages = ['api', 'util', 'instrumenter', 'core', 'vitest-runner'];
const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(outDir);
mkdirSync(out, { recursive: true });

const manifests = new Map(
  packages.map((dir) => {
    const file = path.join(root, 'packages', dir, 'package.json');
    return [dir, { file, text: readFileSync(file, 'utf8') }];
  }),
);
const tarballOf = ({ name, version }) =>
  `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
const urlByName = new Map(
  [...manifests.values()].map(({ text }) => {
    const manifest = JSON.parse(text);
    return [
      manifest.name,
      `https://github.com/${repo}/releases/download/${tag}/${tarballOf(manifest)}`,
    ];
  }),
);

for (const [dir, { file, text }] of manifests) {
  const manifest = JSON.parse(text);
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    const url = urlByName.get(name);
    if (url) manifest.dependencies[name] = url;
  }
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  try {
    execFileSync('pnpm', ['pack', '--pack-destination', out], {
      cwd: path.dirname(file),
      stdio: 'inherit',
    });
  } finally {
    writeFileSync(file, text);
  }
  console.log(`packed ${dir} as ${tarballOf(manifest)}`);
}
