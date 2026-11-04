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
  MUTATION_PACKAGES,
  MUTATION_TEST_EXCLUDES,
  PLUGIN_MUTATION_MODULES,
} from "../../stryker.conf.mjs";
import editorsConfig, {
  EDITOR_MUTATION_BUNFIG,
  EDITOR_MUTATION_PACKAGES,
  editorTestFiles,
} from "../../stryker.editors.conf.mjs";
import mcpConfig, {
  MCP_MUTATION_PACKAGE,
  MCP_MUTATION_SHARDS,
  mcpMutateFor,
  mcpTestFiles,
} from "../../stryker.mcp.conf.mjs";
import treesitterConfig, {
  TREESITTER_MUTATION_MODULES,
  TREESITTER_MUTATION_TESTS,
} from "../../stryker.treesitter.conf.mjs";

const ROOT = join(import.meta.dir, "..", "..");

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

/**
 * A mutation workflow's text, checked to run only when dispatched by hand:
 * mutation runs never start on a schedule, a push or a pull request.
 */
function manualOnlyWorkflow(file: string): string {
  const workflow = readFileSync(
    join(ROOT, ".github", "workflows", file),
    "utf8",
  );
  const on = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(workflow)?.[1] ?? "";
  expect(on.trim()).toBe("workflow_dispatch:");
  for (const trigger of [
    "schedule:",
    "pull_request:",
    "push:",
    "github.event_name",
  ]) {
    expect(workflow).not.toContain(trigger);
  }
  return workflow;
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

  test("every whole package in scope is mutated", () => {
    expect(MUTATION_PACKAGES).toContain("packages/runtime");
    for (const pkg of MUTATION_PACKAGES) {
      expect(config.mutate).toContain(`${pkg}/src/**/*.ts`);
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
        ).filter((file) => !MUTATION_TEST_EXCLUDES.includes(file)),
        ...Object.values(CLI_MUTATION_MODULES).flat(),
        ...Object.values(PLUGIN_MUTATION_MODULES).flat(),
      ]),
    ].sort();
    expect(registered.sort()).toEqual(onDisk);
    for (const excluded of MUTATION_TEST_EXCLUDES) {
      expect(statSync(join(ROOT, excluded)).isFile()).toBe(true);
    }
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

  test("the suite runs only when dispatched by hand", () => {
    const workflow = manualOnlyWorkflow("mutation.yml");
    expect(workflow).toContain("run: bun run build");
    expect(workflow).toContain("run: bun run test:mutation");
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
      const pkg = module.split("/").slice(0, 2).join("/");
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
      ...TREESITTER_MUTATION_MODULES,
      ...EDITOR_MUTATION_PACKAGES.flatMap((pkg) =>
        walkTsFiles(pkg, "src", ".ts"),
      ),
      ...walkTsFiles(MCP_MUTATION_PACKAGE, "src", ".ts"),
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

describe("tree-sitter reader mutation contract", () => {
  const ts = treesitterConfig as StrykerConfig & { buildCommand?: string };

  test("the reader gate is absolute and uses the bun runner", () => {
    expect(ts.thresholds).toEqual({ high: 100, low: 100, break: 100 });
    expect(ts.testRunner).toBe("bun");
    expect(ts.coverageAnalysis).toBe("perTest");
    expect(ts.mutate).toEqual(TREESITTER_MUTATION_MODULES);
  });

  test("every mutated reader and registered test exists", () => {
    for (const module of TREESITTER_MUTATION_MODULES) {
      expect(module).toMatch(/^packages\/plugin-treesitter\/src\/.+\.ts$/);
      expect(statSync(join(ROOT, module)).isFile()).toBe(true);
    }
    for (const test of TREESITTER_MUTATION_TESTS) {
      expect(statSync(join(ROOT, test)).isFile()).toBe(true);
    }
    expect(ts.bun?.testFiles).toEqual(
      TREESITTER_MUTATION_TESTS.map((test) => `./${test}`),
    );
  });

  test("every mutation-*.test.js of the plugin is registered", () => {
    const onDisk = readdirSync(join(ROOT, "packages/plugin-treesitter/tests"))
      .filter((name) => /^mutation-.+\.test\.js$/.test(name))
      .map((name) => `packages/plugin-treesitter/tests/${name}`);
    expect(onDisk.length).toBeGreaterThan(0);
    for (const test of onDisk)
      expect(TREESITTER_MUTATION_TESTS).toContain(test);
  });

  test("the sandbox build compiles the instrumented source and runs it in-process", () => {
    expect(ts.buildCommand).toContain("scripts/mutation-sandbox-treesitter.sh");
    const script = readFileSync(
      join(ROOT, "scripts/mutation-sandbox-treesitter.sh"),
      "utf8",
    );
    expect(script).toContain("scripts/mutation-sandbox-setup.sh");
    expect(script).toContain("scripts/mutation-treesitter-inprocess.mjs");
  });

  test("the reader gate runs only when dispatched by hand", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["test:mutation:treesitter"]).toBe(
      "stryker run stryker.treesitter.conf.mjs",
    );
    const workflow = manualOnlyWorkflow("mutation-treesitter.yml");
    expect(workflow).toContain("run: bun run test:mutation:treesitter");
  });
});

describe("editor host mutation contract", () => {
  const editors = editorsConfig as StrykerConfig & {
    bun?: { bunArgs?: string[] };
  };

  test("the editor gate is absolute and covers both hosts", () => {
    expect(editors.thresholds).toEqual({ high: 100, low: 100, break: 100 });
    expect(editors.testRunner).toBe("bun");
    expect(editors.coverageAnalysis).toBe("perTest");
    expect(EDITOR_MUTATION_PACKAGES).toEqual([
      "packages/opencode",
      "packages/vscode",
    ]);
    expect(editors.mutate).toEqual([
      "packages/opencode/src/**/*.ts",
      "packages/vscode/src/**/*.ts",
    ]);
  });

  test("every test file of both hosts runs against the mutants", () => {
    const onDisk = EDITOR_MUTATION_PACKAGES.flatMap((pkg) =>
      globSync(`${pkg}/tests/**/*.test.ts`, { cwd: ROOT }),
    ).sort();
    expect(onDisk.length).toBeGreaterThan(0);
    expect(editorTestFiles()).toEqual(onDisk);
    expect(editors.bun?.testFiles).toEqual(onDisk.map((test) => `./${test}`));
  });

  test("the lane's bunfig is the root bunfig plus the vscode preload", () => {
    expect(editors.bun?.bunArgs).toEqual([
      `--config=${EDITOR_MUTATION_BUNFIG}`,
    ]);
    const root = readFileSync(join(ROOT, "bunfig.toml"), "utf8");
    const lane = readFileSync(join(ROOT, EDITOR_MUTATION_BUNFIG), "utf8");
    const preload =
      'preload = ["./packages/vscode/tests/shared/vscode-preload.ts"]\n';
    expect(lane.slice(lane.indexOf("[test]\n"))).toBe(
      root.replace("[test]\n", `[test]\n${preload}`),
    );
    expect(
      statSync(
        join(ROOT, "packages/vscode/tests/shared/vscode-preload.ts"),
      ).isFile(),
    ).toBe(true);
  });

  test("the editor gate runs only when dispatched by hand", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["test:mutation:editors"]).toBe(
      "stryker run stryker.editors.conf.mjs",
    );
    const workflow = manualOnlyWorkflow("mutation-editors.yml");
    expect(workflow).toContain("run: bun run test:mutation:editors");
  });
});

describe("kibi-mcp mutation contract", () => {
  const mcp = mcpConfig as StrykerConfig & { bun?: { timeout?: number } };

  test("the mcp gate is absolute and covers the whole package", () => {
    expect(mcp.thresholds).toEqual({ high: 100, low: 100, break: 100 });
    expect(mcp.testRunner).toBe("bun");
    expect(mcp.coverageAnalysis).toBe("perTest");
    expect(MCP_MUTATION_PACKAGE).toBe("packages/mcp");
    expect(mcp.mutate).toEqual([
      "packages/mcp/src/**/*.ts",
      "!packages/mcp/src/types/**/*.d.ts",
    ]);
    expect(mcp.bun?.timeout).toBeGreaterThanOrEqual(300000);
  });

  test("the CI shards mutate every source file exactly once", () => {
    const sources = globSync("packages/mcp/src/**/*.ts", { cwd: ROOT })
      .filter((file) => !/^packages\/mcp\/src\/types\/.*\.d\.ts$/.test(file))
      .sort();
    const listed = MCP_MUTATION_SHARDS.flat();
    expect(new Set(listed).size).toBe(listed.length);
    for (const file of listed) expect(sources).toContain(file);
    for (const [index, group] of MCP_MUTATION_SHARDS.entries()) {
      expect(group.length).toBeGreaterThan(0);
      expect(mcpMutateFor(String(index + 1))).toEqual(group);
    }
    const rest = mcpMutateFor(String(MCP_MUTATION_SHARDS.length + 1));
    expect(rest).toEqual([
      ...(mcp.mutate ?? []),
      ...listed.map((file) => `!${file}`),
    ]);
    expect(mcpMutateFor(undefined)).toEqual(mcp.mutate);
    expect(mcpMutateFor("")).toEqual(mcp.mutate);
    for (const bad of [
      "0",
      String(MCP_MUTATION_SHARDS.length + 2),
      "1.5",
      "x",
    ]) {
      expect(() => mcpMutateFor(bad)).toThrow("MCP_MUTATION_SHARD must be");
    }
  });

  test("every mcp test file runs against the mutants", () => {
    const onDisk = globSync("packages/mcp/tests/**/*.test.ts", {
      cwd: ROOT,
    }).sort();
    expect(onDisk.length).toBeGreaterThan(0);
    expect(mcpTestFiles()).toEqual(onDisk);
    expect(mcp.bun?.testFiles).toEqual(onDisk.map((test) => `./${test}`));
  });

  test("the mcp gate runs with SWI-Prolog only when dispatched by hand", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["test:mutation:mcp"]).toBe(
      "stryker run stryker.mcp.conf.mjs",
    );
    const workflow = manualOnlyWorkflow("mutation-mcp.yml");
    expect(workflow).toContain("run: bun run test:mutation:mcp");
    const shards = Array.from(
      { length: MCP_MUTATION_SHARDS.length + 1 },
      (_, index) => index + 1,
    );
    expect(workflow).toContain(`shard: [${shards.join(", ")}]`);
    expect(workflow).toContain("MCP_MUTATION_SHARD: ${{ matrix.shard }}");
    expect(workflow).toContain("uses: ./.github/actions/use-bundled-swipl");
  });
});

describe("Prolog mutation workflow", () => {
  test("the Mutalog lane runs only when dispatched by hand", () => {
    const workflow = manualOnlyWorkflow("mutation-prolog.yml");
    expect(workflow).toContain("test:mutation:prolog");
  });
});
