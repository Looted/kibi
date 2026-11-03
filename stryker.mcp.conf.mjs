// Mutation testing configuration for kibi-mcp (`bun run test:mutation:mcp`).
// See docs/mutation-testing.md.
//
// The gate is absolute, as in stryker.conf.mjs: one surviving mutant fails
// the run. It is a lane of its own because the mcp suite starts real Kibi
// engines (SWI-Prolog) and takes minutes, so it gets its own CI job with the
// pipeline-built SWI-Prolog and a longer per-run bound.
import { readdirSync } from "node:fs";
import { join, posix } from "node:path";

export const MCP_MUTATION_PACKAGE = "packages/mcp";

// Every tests/**/*.test.ts file of the package, relative to the root.
export function mcpTestFiles() {
  const files = [];
  const walk = (rel) => {
    for (const entry of readdirSync(join(MCP_MUTATION_PACKAGE, "tests", rel), {
      withFileTypes: true,
    })) {
      if (entry.isDirectory()) walk(posix.join(rel, entry.name));
      else if (entry.name.endsWith(".test.ts"))
        files.push(posix.join(MCP_MUTATION_PACKAGE, "tests", rel, entry.name));
    }
  };
  walk("");
  return files.sort();
}

/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
const config = {
  testRunner: "bun",
  plugins: ["@hughescr/stryker-bun-runner"],
  coverageAnalysis: "perTest",
  mutate: [
    `${MCP_MUTATION_PACKAGE}/src/**/*.ts`,
    // Type declarations only.
    `!${MCP_MUTATION_PACKAGE}/src/types/**/*.d.ts`,
  ],
  bun: {
    testFiles: mcpTestFiles().map((test) => `./${test}`),
    // The whole suite runs in one process in about two and a half minutes.
    timeout: 300000,
    inspectorTimeout: 30000,
  },
  ignorePatterns: [
    "plugins/**",
    "tools/skillopt/.venv/**",
    ".codegraph",
    ".codegraph/**",
    ".claude/worktrees/**",
  ],
  buildCommand: "sh scripts/mutation-sandbox-setup.sh",
  thresholds: { high: 100, low: 100, break: 100 },
  concurrency: 4,
  reporters: ["progress", "html", "json", "clear-text"],
  htmlReporter: { fileName: "reports/mutation/mcp/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/mcp/mutation.json" },
  warnings: { unknownOptions: false },
  timeoutMS: 20000,
  timeoutFactor: 1.5,
};

export default config;
