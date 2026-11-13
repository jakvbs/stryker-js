import type { NodePath } from '../ignore/index.js';

/**
 * An AST node a mutator returns as the replacement of the node it visits. Left empty so the declaration can be merged;
 * the instrumenter hands in and expects Babel nodes.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MutatorNode {}

/**
 * A replacement a mutator plugin yields, with the name its mutant reports as `mutatorName` in reports and the
 * incremental file.
 */
export interface MutatorReplacement {
  name: string;
  replacement: MutatorNode;
}

/**
 * A mutator plugin supplies mutants beside Stryker's own mutators. The instrumenter calls it for every node it visits
 * and places each replacement it yields into the mutant schemata. `// Stryker disable` comments name the plugin;
 * `mutator.excludedMutations` takes the plugin's name or a replacement's name.
 */
export interface Mutator {
  mutate(path: NodePath): Iterable<MutatorReplacement>;
}
