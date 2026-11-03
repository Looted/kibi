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

// CI splits the run into parallel jobs: a whole run takes about two and a
// half hours on one runner, because the mutants of a few modules are covered
// by engine-starting tests. Each listed group is one job, balanced by the
// measured cost of its mutants; the last job (MCP_MUTATION_SHARDS.length + 1)
// takes every source file no group lists. Locally, with MCP_MUTATION_SHARD
// unset, one run mutates the whole package.
export const MCP_MUTATION_SHARDS = [
  ["packages/mcp/src/server/tools.ts"],
  ["packages/mcp/src/tools/symbols.ts"],
  [
    "packages/mcp/src/server/workspace-router.ts",
    "packages/mcp/src/server/session.ts",
  ],
  [
    "packages/mcp/src/server/json-schema-to-zod.ts",
    "packages/mcp/src/diagnostics.ts",
    "packages/mcp/src/server/docs.ts",
    "packages/mcp/src/diagnostics-helpers.ts",
    "packages/mcp/src/tools/mutation-context.ts",
  ],
];

const WHOLE_PACKAGE = [
  `${MCP_MUTATION_PACKAGE}/src/**/*.ts`,
  // Type declarations only.
  `!${MCP_MUTATION_PACKAGE}/src/types/**/*.d.ts`,
];

// The mutate globs for one CI job (1-based), or the whole package.
export function mcpMutateFor(shard) {
  if (shard === undefined || shard === "") return WHOLE_PACKAGE;
  const index = Number(shard);
  if (
    !Number.isInteger(index) ||
    index < 1 ||
    index > MCP_MUTATION_SHARDS.length + 1
  ) {
    throw new Error(
      `MCP_MUTATION_SHARD must be 1..${MCP_MUTATION_SHARDS.length + 1}, got ${shard}`,
    );
  }
  if (index <= MCP_MUTATION_SHARDS.length)
    return MCP_MUTATION_SHARDS[index - 1];
  return [
    ...WHOLE_PACKAGE,
    ...MCP_MUTATION_SHARDS.flat().map((file) => `!${file}`),
  ];
}

const SHARD = process.env.MCP_MUTATION_SHARD;
const REPORT_DIR = SHARD
  ? `reports/mutation/mcp/shard-${SHARD}`
  : "reports/mutation/mcp";

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
  mutate: mcpMutateFor(SHARD),
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
  htmlReporter: { fileName: `${REPORT_DIR}/mutation.html` },
  jsonReporter: { fileName: `${REPORT_DIR}/mutation.json` },
  warnings: { unknownOptions: false },
  timeoutMS: 20000,
  timeoutFactor: 1.5,
};

export default config;
