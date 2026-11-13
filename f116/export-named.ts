// Writes the named mutants given by name, or with no names every one in code under packages/, as a JSON table for the
// named-mutants plugin. Usage: bun f116/export-named.ts <legible root> [<name>...] > table.json
import { loadMutants } from "./legible-mutants.ts";

const [legible, ...names] = process.argv.slice(2);
const all = await loadMutants(legible);
const picked = names.length === 0 ? all.filter((m) => m.file.startsWith("packages/")) : names.map((name) => {
  const mutant = all.find((m) => m.name === name);
  if (!mutant) throw new Error(`no named mutant "${name}"`);
  return mutant;
});
console.log(JSON.stringify(picked, null, 2));
