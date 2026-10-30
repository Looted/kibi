import { describe, expect, test } from "bun:test";
import {
  existsSync,
  globSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

import strykerConfig, {
  CLI_MUTATION_MODULES,
  PLUGIN_MUTATION_MODULES,
} from "../../stryker.conf.mjs";

const ROOT = join(import.meta.dir, "..", "..");
const MUTATION_PACKAGES = [
  "packages/runtime",
  "packages/codex",
  "packages/cursor",
] as const;

type StrykerConfig = {
  testRunner?: string;
  coverageAnalysis?: string;
  plugins?: string[];
  mutate?: string[];
  bun?: { testFiles?: string[] };
  thresholds?: { high?: number; low?: number; break?: number };
};

const config = strykerConfig as StrykerConfig;

function walkTsFiles(
  packageRoot: string,
  leaf: string,
  suffix: string,
): string[] {
  const files: string[] = [];
  const walk = (rel: string) => {
    const abs = join(ROOT, packageRoot, leaf, rel);
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(rel ? `${rel}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith(suffix)) {
        files.push(
          `${packageRoot}/${leaf}/${rel ? `${rel}/` : ""}${entry.name}`,
        );
      }
    }
  };
  walk("");
  return files.sort();
}

describe("mutation testing workflow contract", () => {
  test("the gate is absolute: any surviving mutant fails the run", () => {
    expect(config.thresholds).toEqual({ high: 100, low: 100, break: 100 });
  });

  test("the runner is the bun plugin with perTest coverage", () => {
    expect(config.testRunner).toBe("bun");
    expect(config.plugins).toContain("@hughescr/stryker-bun-runner");
    expect(config.coverageAnalysis).toBe("perTest");
  });

  test("every positive mutate glob resolves to real source files", () => {
    const globs = (config.mutate ?? []).filter((g) => !g.startsWith("!"));
    expect(globs.length).toBeGreaterThan(0);
    for (const pattern of globs) {
      const matches = globSync(pattern, { cwd: ROOT });
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  test("the runtime re-export barrel stays excluded from mutation", () => {
    expect(config.mutate).toContain("!packages/runtime/src/index.ts");
    const excluded = (config.mutate ?? [])
      .filter((g) => g.startsWith("!"))
      .map((g) => g.slice(1));
    for (const pattern of excluded) {
      expect(existsSync(join(ROOT, pattern))).toBe(true);
    }
  });

  test("mutated sources never include tests or dist output", () => {
    const globs = (config.mutate ?? []).filter((g) => !g.startsWith("!"));
    for (const pattern of globs) {
      for (const match of globSync(pattern, { cwd: ROOT })) {
        expect(match).not.toMatch(/(^|\/)(tests|dist)(\/|$)/);
      }
    }
  });

  test("every scoped test file is registered with the bun runner", () => {
    const registered = (config.bun?.testFiles ?? []).map((f) =>
      f.replace(/^\.\//, ""),
    );
    expect(registered.length).toBeGreaterThan(0);
    const onDisk = [
      ...new Set([
        ...MUTATION_PACKAGES.flatMap((pkg) =>
          walkTsFiles(pkg, "tests", ".test.ts"),
        ),
        ...Object.values(CLI_MUTATION_MODULES).flat(),
        ...Object.values(PLUGIN_MUTATION_MODULES).flat(),
      ]),
    ].sort();
    expect(registered.sort()).toEqual(onDisk);
    for (const rel of registered) {
      expect(statSync(join(ROOT, rel)).isFile()).toBe(true);
    }
  });

  test("the runner is wired as test:mutation and reports are gitignored", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["test:mutation"]).toBe("stryker run");
    const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
    expect(gitignore).toContain(".stryker-tmp/");
    expect(gitignore).toContain("reports/mutation/");
  });

  test("CI runs the suite and triggers on every mutated package", () => {
    const workflow = readFileSync(
      join(ROOT, ".github", "workflows", "mutation.yml"),
      "utf8",
    );
    expect(workflow).toContain("run: bun run build");
    expect(workflow).toContain("run: bun run test:mutation");
    expect(workflow).toContain("schedule:");
    for (const pkg of MUTATION_PACKAGES) {
      expect(workflow).toContain(`- '${pkg}/src/**'`);
      expect(workflow).toContain(`- '${pkg}/tests/**'`);
    }
    expect(workflow).toContain("- 'stryker.conf.mjs'");
    for (const [module, tests] of Object.entries(PLUGIN_MUTATION_MODULES)) {
      const pkg = module.split("/src/")[0];
      const covered = (path: string, leaf: string) =>
        workflow.includes(`- '${path}'`) ||
        workflow.includes(`- '${pkg}/${leaf}/**'`);
      expect(covered(module, "src")).toBe(true);
      for (const test of tests) expect(covered(test, "tests")).toBe(true);
    }
    for (const [module, tests] of Object.entries(CLI_MUTATION_MODULES)) {
      expect(workflow).toContain(`- '${module}'`);
      for (const test of tests) expect(workflow).toContain(`- '${test}'`);
    }
  });

  test("every kibi-cli module in scope is mutated and has its own tests", () => {
    const modules = Object.entries(CLI_MUTATION_MODULES);
    expect(modules.length).toBeGreaterThan(0);
    for (const [module, tests] of modules) {
      expect(config.mutate).toContain(module);
      expect(statSync(join(ROOT, module)).isFile()).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
      for (const test of tests) {
        expect(test).toMatch(/^packages\/cli\/tests\/.+\.test\.ts$/);
        expect(statSync(join(ROOT, test)).isFile()).toBe(true);
      }
    }
  });

  test("every plugin module in scope is mutated and tested by its own package", () => {
    const modules = Object.entries(PLUGIN_MUTATION_MODULES);
    expect(modules.length).toBeGreaterThan(0);
    for (const [module, tests] of modules) {
      expect(config.mutate).toContain(module);
      expect(statSync(join(ROOT, module)).isFile()).toBe(true);
      const pkg = module.split("/src/")[0];
      expect(tests.length).toBeGreaterThan(0);
      for (const test of tests) {
        expect(test.startsWith(`${pkg}/tests/`)).toBe(true);
        expect(test.endsWith(".test.ts")).toBe(true);
        expect(statSync(join(ROOT, test)).isFile()).toBe(true);
      }
    }
  });

  test("Stryker disable comments in scope must carry a nearby rationale", () => {
    const sources = [
      ...MUTATION_PACKAGES.flatMap((pkg) => walkTsFiles(pkg, "src", ".ts")),
      ...Object.keys(CLI_MUTATION_MODULES),
      ...Object.keys(PLUGIN_MUTATION_MODULES),
    ];
    for (const file of sources) {
      const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!line.includes("Stryker disable")) return;
        const preceding = lines.slice(Math.max(0, index - 3), index);
        expect(
          preceding.some((context) => context.includes("rationale:")),
          `${file}:${index + 1} disables mutants without a "rationale:" comment above`,
        ).toBe(true);
      });
    }
  });
});
