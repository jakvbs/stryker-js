# F116 prototype: Legible on this Stryker branch

Tooling and configs from the F116 prototype (Legible ticket F116). Nothing here is part of StrykerJS.

- `named-mutants-plugin.mjs`: a `Mutator` plugin, `Named`, that places Legible's text mutants (`from` replaced by `to`) in the schemata.
- `export-named.ts <legible> [<name>...]`: writes a table of named mutants for the plugin (`five.json` holds the five ported ones).
- `overlap.ts <legible> <mutation.json> packages/engine/`: how many named mutants have a Stryker mutant on the same line, or the identical change.
- `legible/`: the configs used. Engine configs go in `packages/engine`, the SQLite ones at Legible's root. Their plugin paths are absolute to this worktree.

Run from Legible, after `pnpm run build` here:

```sh
S=<this worktree>
cd packages/engine && node $S/packages/core/bin/stryker.js run                 # engine, Node
cd packages/engine && node $S/packages/core/bin/stryker.js run stryker.named.config.json
bun --bun $S/packages/core/bin/stryker.js run stryker.sqlite.config.json        # SQLite suite, Bun
```
