import { describe, expect, test } from "bun:test";
import {
  existsSync,
  globSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

import strykerConfig from "../../stryker.conf.mjs";

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
    const onDisk = MUTATION_PACKAGES.flatMap((pkg) =>
      walkTsFiles(pkg, "tests", ".test.ts"),
    ).sort();
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

  test("Stryker disable comments in scope must carry a nearby rationale", () => {
    for (const pkg of MUTATION_PACKAGES) {
      for (const file of walkTsFiles(pkg, "src", ".ts")) {
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
    }
  });
});
