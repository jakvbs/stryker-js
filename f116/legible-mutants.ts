// Loads the named-mutant table from Legible's scripts/engine-mutants.ts without running the script.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface NamedMutant {
  readonly name: string;
  readonly file: string;
  readonly from: string;
  readonly to: string;
}

export const loadMutants = async (legible: string): Promise<ReadonlyArray<NamedMutant>> => {
  const script = readFileSync(join(legible, "scripts/engine-mutants.ts"), "utf8");
  const temp = join(legible, "scripts/.f116-mutants.ts");
  writeFileSync(temp, `${script.slice(0, script.indexOf("const vitest ="))}\nexport { mutants };\n`);
  try {
    return (await import(temp)).mutants;
  } finally {
    rmSync(temp);
  }
};
