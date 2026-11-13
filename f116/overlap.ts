// F116: for each named mutant in Legible's scripts/engine-mutants.ts, is there a Stryker mutant in the same file whose
// span touches the named mutant's lines? Usage: bun f116/overlap.ts <legible root> <stryker mutation.json> <mutate root>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadMutants } from "./legible-mutants.ts";

const [legible, report, mutateRoot] = process.argv.slice(2);
const mutants = await loadMutants(legible);

interface Loc { line: number; column: number }
interface StrykerMutant { mutatorName: string; status: string; replacement: string; location: { start: Loc; end: Loc } }
const files: Record<string, { mutants: StrykerMutant[] }> = JSON.parse(readFileSync(report, "utf8")).files;

const offset = (source: string, loc: Loc) => source.split("\n").slice(0, loc.line - 1).reduce((n, l) => n + l.length + 1, 0) + loc.column - 1;
const squash = (text: string) => text.replace(/\s+/g, "");

const rows = mutants.map((m: { name: string; file: string; from: string; to: string }) => {
  const source = readFileSync(join(legible, m.file), "utf8");
  const at = source.indexOf(m.from);
  const first = source.slice(0, at).split("\n").length;
  const last = first + m.from.split("\n").length - 1;
  const key = m.file.startsWith(mutateRoot) ? m.file.slice(mutateRoot.length) : undefined;
  const hits = (key && files[key]?.mutants || []).filter((s) => s.location.start.line <= last && s.location.end.line >= first);
  const onLine = hits.filter((s) => s.location.start.line >= first && s.location.start.line <= last);
  const named = squash(source.replace(m.from, m.to));
  const same = hits.filter((s) => squash(source.slice(0, offset(source, s.location.start)) + s.replacement + source.slice(offset(source, s.location.end))) === named);
  return { same: same.length, name: m.name, file: m.file, first, any: hits.length, onLine: onLine.length, killed: onLine.filter((s) => s.status === "Killed" || s.status === "Timeout").length, mutators: [...new Set(onLine.map((s) => s.mutatorName))].join(",") };
});

const total = rows.length;
const share = (n: number) => `${n}/${total} (${((100 * n) / total).toFixed(1)}%)`;
console.log(`named mutants: ${total}`);
console.log(`a Stryker mutant starts on the same line(s): ${share(rows.filter((r) => r.onLine > 0).length)}`);
console.log(`a Stryker mutant span covers the line(s):    ${share(rows.filter((r) => r.any > 0).length)}`);
console.log(`... and one of those on-line mutants was killed: ${share(rows.filter((r) => r.killed > 0).length)}`);
console.log(`a Stryker mutant makes the identical change:  ${share(rows.filter((r) => r.same > 0).length)}`);
for (const r of rows.filter((r) => r.same > 0)) console.log(`  identical: ${r.name}`);
console.log("\nmisses (no Stryker mutant starting on the line):");
for (const r of rows.filter((r) => r.onLine === 0)) console.log(`  ${r.file}:${r.first}  ${r.name}${r.any ? "  (inside a wider mutant)" : ""}`);
