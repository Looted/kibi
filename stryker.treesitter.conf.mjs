// Mutation testing configuration for kibi-plugin-treesitter's source-proof
// readers (`bun run test:mutation:treesitter`). See docs/mutation-testing.md.
//
// Scope: the PHP, C, Bash and HCL reference readers and the helpers they
// share. The gate is absolute, as in stryker.conf.mjs: one surviving mutant
// fails the run. references.ts (the older readers) stays out of scope.
//
// The plugin's tests import its built dist, and its readers run in worker
// threads that never see the runner's main-thread preload (mutant switching
// and coverage). The build command compiles the instrumented source inside
// each sandbox and swaps the worker pool for an in-process shim
// (scripts/mutation-treesitter-inprocess.mjs).

export const TREESITTER_MUTATION_MODULES = [
  "packages/plugin-treesitter/src/references-php.ts",
  "packages/plugin-treesitter/src/references-c.ts",
  "packages/plugin-treesitter/src/references-bash.ts",
  "packages/plugin-treesitter/src/references-hcl.ts",
  "packages/plugin-treesitter/src/preprocessor-idioms.ts",
  "packages/plugin-treesitter/src/reference-nodes.ts",
];

export const TREESITTER_MUTATION_TESTS = [
  "references-more-languages",
  "broad-catalog",
  "references",
  "coverage-references",
  "preprocessor-idioms",
  "coverage-symbols",
  "mutation-references",
  "mutation-hcl",
  "mutation-c",
  "mutation-php",
  "mutation-bash",
].map((name) => `packages/plugin-treesitter/tests/${name}.test.js`);

/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
const config = {
  testRunner: "bun",
  plugins: ["@hughescr/stryker-bun-runner"],
  coverageAnalysis: "perTest",
  mutate: TREESITTER_MUTATION_MODULES,
  bun: {
    testFiles: TREESITTER_MUTATION_TESTS.map((test) => `./${test}`),
    timeout: 120000,
    inspectorTimeout: 30000,
  },
  ignorePatterns: [
    "plugins/**",
    "tools/skillopt/.venv/**",
    ".codegraph",
    ".codegraph/**",
    // Local agent worktrees are whole checkouts of the repository.
    ".claude/worktrees/**",
    ".kb/branches/**",
    "reports/**",
  ],
  // Stryker runs this without a shell and before node_modules is linked into
  // the sandbox, so the script gets the repository root to find tsc.
  buildCommand: `sh scripts/mutation-sandbox-treesitter.sh ${process.cwd()}`,
  thresholds: { high: 100, low: 100, break: 100 },
  concurrency: 4,
  reporters: ["progress", "html", "json", "clear-text"],
  htmlReporter: { fileName: "reports/mutation/treesitter/mutation.html" },
  jsonReporter: { fileName: "reports/mutation/treesitter/mutation.json" },
  warnings: { unknownOptions: false },
  timeoutMS: 20000,
  timeoutFactor: 1.5,
};

export default config;
