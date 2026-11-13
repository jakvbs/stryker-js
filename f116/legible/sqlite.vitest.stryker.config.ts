import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The sandbox symlinks apps/agent/node_modules to the real one, whose @legible/engine link leaves the sandbox; the alias
// keeps the engine inside it so the mutated sources are the ones tested.
const engine = fileURLToPath(new URL("packages/engine/src/", import.meta.url));
export default defineConfig({
  resolve: { alias: [{ find: /^@legible\/engine\/conformance$/, replacement: `${engine}conformance.ts` }, { find: /^@legible\/engine$/, replacement: `${engine}index.ts` }] },
  test: {
    root: "apps/agent",
    include: ["src/**/engine-sqlite*.test.ts"],
    maxWorkers: 1,
    env: { GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.fsmonitor", GIT_CONFIG_VALUE_0: "false" },
  },
});
