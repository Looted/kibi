// Mutation testing configuration for the editor hosts, kibi-opencode and
// kibi-vscode (`bun run test:mutation:editors`). See docs/mutation-testing.md.
//
// The gate is absolute, as in stryker.conf.mjs: one surviving mutant fails
// the run. It is a lane of its own because the vscode sources import the
// `vscode` module, which only exists inside the editor: the bun runner's
// coverage preload imports every mutated module before the tests register
// their stub, so this lane runs `bun test` with bunfig.mutation-editors.toml,
// whose preload registers the shared stub first.
import { readdirSync } from "node:fs";
import { join, posix } from "node:path";

export const EDITOR_MUTATION_PACKAGES = [
  "packages/opencode",
  "packages/vscode",
];

export const EDITOR_MUTATION_BUNFIG = "bunfig.mutation-editors.toml";

// Every tests/**/*.test.ts file of the two packages, relative to the root.
export function editorTestFiles() {
  const files = [];
  for (const pkg of EDITOR_MUTATION_PACKAGES) {
    const walk = (rel) => {
      for (const entry of readdirSync(join(pkg, "tests", rel), {
        withFileTypes: true,
      })) {
        if (entry.isDirectory()) walk(posix.join(rel, entry.name));
        else if (entry.name.endsWith(".test.ts"))
          files.push(posix.join(pkg, "tests", rel, entry.name));
      }
    };
    walk("");
  }
  return files.sort();
}

/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
const config = {
  testRunner: "bun",
  plugins: ["@hughescr/stryker-bun-runner"],
  coverageAnalysis: "perTest",
  mutate: EDITOR_MUTATION_PACKAGES.map((pkg) => `${pkg}/src/**/*.ts`),
  bun: {
    testFiles: editorTestFiles().map((test) => `./${test}`),
    bunArgs: [`--config=${EDITOR_MUTATION_BUNFIG}`],
    timeout: 120000,
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
  htmlReporter: { fileName: "reports/mutation/editors/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/editors/mutation.json" },
  warnings: { unknownOptions: false },
  timeoutMS: 20000,
  timeoutFactor: 1.5,
};

export default config;
