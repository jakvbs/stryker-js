// F116 prototype: a Mutator plugin that turns Legible's named mutants (text `from` replaced by `to`, once in `file`) into
// Stryker mutants. It yields the replacement on the smallest expression or statement that contains `from`, so the
// instrumenter places it in the schemata like any built-in mutant.
// Config: "plugins": [".../named-mutants-plugin.mjs"], "mutators": ["Named"], "namedMutants": "<table.json>"; a mutant
// applies to the mutated file whose path ends in its `file` (export a table with f116/export-named.ts).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(
  new URL('../packages/instrumenter/package.json', import.meta.url),
);
const { types: t } = require('@babel/core');
const { parse } = require('@babel/parser');
const { declareFactoryPlugin, PluginKind, commonTokens } = await import(
  new URL('../packages/api/dist/src/plugin/index.js', import.meta.url).href
);

// A snippet is parsed inside a labelled loop in an async generator, so the `yield`, `await`, `continue` and `return` it
// takes from its context parse; error recovery accepts private names of the enclosing class.
const parserOptions = {
  sourceType: 'module',
  plugins: ['typescript'],
  errorRecovery: true,
};
const wrap = (code) =>
  `async function* __named() { __loop: for (;;) {\n${code}\n} }`;

/** Expression wrappers TypeScript adds; every other `TS` node is erased at run time. */
const runtimeTs = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  'TSInstantiationExpression',
]);
const typeOnly = (node) =>
  node.type.startsWith('TS') && !runtimeTs.has(node.type);

// A declaration placed in the schemata's `if` would scope its names to that branch, so its enclosing block is replaced.
const isTarget = (node) =>
  (t.isExpression(node) || t.isStatement(node)) &&
  !t.isDeclaration(node) &&
  !typeOnly(node);

const contains = (node, at, end) =>
  node.start != null && node.start <= at && end <= node.end;

const inType = Symbol('inType');

/**
 * The deepest expression or statement under `node` (itself included) that contains [at, end), or `inType` when the
 * range lies in a type, which a runtime mutant cannot change.
 */
function deepest(node, at, end) {
  for (const key of t.VISITOR_KEYS[node.type] ?? []) {
    for (const child of [node[key]].flat()) {
      if (child && typeof child.type === 'string' && contains(child, at, end)) {
        if (typeOnly(child)) return inType;
        const found = deepest(child, at, end);
        if (found) return found;
      }
    }
  }
  return isTarget(node) ? node : undefined;
}

function replacement(node, text) {
  const expression = t.isExpression(node);
  const program = parse(wrap(expression ? `(${text});` : text), parserOptions);
  const fatal = program.errors?.find((e) => !/[Pp]rivate name/.test(e.message));
  if (fatal) throw new Error(fatal.message);
  const body = program.program.body[0].body.body[0].body.body.body;
  const mutated = expression
    ? body[0].expression
    : body.length === 1
      ? body[0]
      : body.length === 0
        ? t.emptyStatement()
        : t.blockStatement(body);
  return t.cloneNode(mutated, true, true);
}

function createNamedMutator(options) {
  const table = JSON.parse(readFileSync(options.namedMutants, 'utf8'));
  /** Per file, the named mutants with the offset of their `from` text, found once. */
  const byFile = new Map();
  const forFile = (fileName, code) => {
    if (!byFile.has(fileName)) {
      byFile.set(
        fileName,
        table
          .filter((m) => fileName.endsWith(`${path.sep}${m.file}`))
          .map((m) => {
            const at = code.indexOf(m.from);
            if (at < 0 || code.indexOf(m.from, at + 1) >= 0)
              throw new Error(`${m.name}: expected the text once in ${m.file}`);
            return { ...m, at, end: at + m.from.length };
          }),
      );
    }
    return byFile.get(fileName);
  };
  return {
    *mutate(nodePath) {
      const node = nodePath.node;
      const file = nodePath.hub?.file;
      if (!file || !isTarget(node)) return;
      for (const m of forFile(file.opts.filename, file.code)) {
        if (
          contains(node, m.at, m.end) &&
          deepest(node, m.at, m.end) === node
        ) {
          const code = file.code;
          const text =
            code.slice(node.start, m.at) + m.to + code.slice(m.end, node.end);
          let mutated;
          try {
            mutated = replacement(node, text);
          } catch (error) {
            // A snippet that only parses in its context (a private name, a `super` call) is not placed yet.
            console.error(`F116 unplaced: ${m.name}: ${error.message}`);
            continue;
          }
          yield mutated;
        }
      }
    },
  };
}
createNamedMutator.inject = [commonTokens.options];

export const strykerPlugins = [
  declareFactoryPlugin(PluginKind.Mutator, 'Named', createNamedMutator),
];
