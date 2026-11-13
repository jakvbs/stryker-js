import { Ignorer } from '@stryker-mutator/api/ignore';
import { Mutator } from '@stryker-mutator/api/mutate';

import { MutatorOptions } from '../mutators/index.js';

export interface TransformerOptions extends MutatorOptions {
  ignorers: Ignorer[];
  /** Mutator plugins by name, run beside the built-in mutators. */
  mutators?: ReadonlyMap<string, Mutator>;
}
