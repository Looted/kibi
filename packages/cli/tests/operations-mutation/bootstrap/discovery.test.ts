import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as activation from "../../../src/operations/bootstrap/activation.js";
import { classifyActivation } from "../../../src/operations/bootstrap/activation.js";
import * as discoveryEvidence from "../../../src/operations/bootstrap/discovery-evidence.js";
import { scanEvidence } from "../../../src/operations/bootstrap/discovery-evidence.js";
import { discoverBootstrap } from "../../../src/operations/bootstrap/discovery.js";
import { pluginOffers } from "../../../src/operations/bootstrap/plugin-offers.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import * as kbManifest from "../../../src/utils/kb-manifest.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  removeTempWorkspaces();
});

const MANIFEST = JSON.stringify({
  manifestVersion: 1,
  schemaVersion: 13,
  semanticAdvisorBackfill: "not_applicable",
});

function context(
  root: string,
  files: Record<string, string>,
  options: { ignored?: string[]; statOk?: boolean } = {},
): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-20T00:00:00Z"),
    fs: {
      glob: async () => Object.keys(files),
      readFile: async (absolute: string) => {
        const relative = absolute.slice(root.length + 1);
        const content = files[relative];
        if (content === undefined) throw new Error(`unreadable ${relative}`);
        return content;
      },
      stat: async () => {
        if (!options.statOk) throw new Error("missing");
        return {};
      },
    },
    git: { ignoredPaths: async () => options.ignored ?? [] },
  } as unknown as OperationContext;
}

const EXCLUDED = [
  ".git",
  ".kb",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "third-party",
  "third_party",
  "vendor",
  "vendors",
  "venv",
];

describe("discoverBootstrap", () => {
  test("summarizes sorted evidence, languages, frameworks and warnings", async () => {
    const files: Record<string, string> = {
      "README.md": "# Readme\n",
      "docs/b.md": "# B\n",
      "package.json": JSON.stringify({ bin: "cli.ts" }),
      "pyproject.toml": "[project]\n",
      "src/a.ts": "export const a = 1;\n",
      "src/b.tsx": "export const b = 1;\n",
      "src/c.mts": "",
      "src/d.cts": "",
      "src/e.js": "",
      "src/f.jsx": "",
      "src/g.mjs": "",
      "src/h.cjs": "",
      "src/i.py": "",
      "src/j.rb": "",
      "src/k.rs": "",
      "src/l.pl": ":- module(l, []).\n",
      "src/m.go": "",
      "src/ignored.kt": "",
      "src/ignored.tsx": "",
      "tests/a.test.ts": 'import { test } from "bun:test";\n',
      "tests/b.test.ts": 'import { test } from "vitest";\nimport "bun:test";\n',
      "src/broken.ts": undefined as unknown as string,
      "src/broken2.ts": undefined as unknown as string,
    };
    const root = tempWorkspace();
    const ctx = context(root, files, {
      ignored: ["src/ignored.kt", "src/ignored.tsx"],
    });
    const result = await discoverBootstrap(ctx);
    const scan = await scanEvidence(ctx);
    const tracked = scan.files.filter(
      (file) => !file.startsWith("src/ignored."),
    );
    expect(await pluginOffers(ctx, scan.files)).not.toStrictEqual(
      await pluginOffers(ctx, tracked),
    );
    expect(result.activation).toStrictEqual(
      await classifyActivation(ctx, tracked),
    );
    expect(result.pluginOffers).toStrictEqual(await pluginOffers(ctx, tracked));
    expect(result.ignoredSources).toStrictEqual([
      "src/ignored.kt",
      "src/ignored.tsx",
    ]);
    expect(result.migrationWarning).toBe(
      "Kibi lifecycle manifest is missing; run 'kibi init' or 'kibi migrate' to create it.",
    );
    expect(
      result.evidence.map((item) => `${item.provider}:${item.label}`),
    ).toStrictEqual([
      "generic_repo_docs:docs/b.md",
      "generic_repo_docs:README.md",
      "repo_metadata:package.json",
      "repo_metadata:pyproject.toml",
      "repo_layout:docs",
      "repo_layout:src",
      "repo_layout:tests",
      "test_topology:tests/a.test.ts",
      "test_topology:tests/b.test.ts",
      "source_symbols:src/a.ts",
      "source_symbols:src/b.tsx",
      "source_symbols:src/c.mts",
      "source_symbols:src/d.cts",
      "source_symbols:src/e.js",
      "source_symbols:src/f.jsx",
      "source_symbols:src/g.mjs",
      "source_symbols:src/h.cjs",
      "source_symbols:src/i.py",
      "source_symbols:src/j.rb",
      "source_symbols:src/k.rs",
      "source_symbols:src/l.pl",
      "source_symbols:src/m.go",
    ]);
    expect(result.summary).toStrictEqual({
      activationState: "root_uninitialized",
      activationMode: "cold_start_bootstrap",
      applyBlocked: true,
      reason: result.activation.reason,
      handoffMessage: result.activation.handoffMessage as string,
      providersRun: [
        "typed_kibi_docs",
        "generic_repo_docs",
        "repo_metadata",
        "repo_layout",
        "test_topology",
        "source_symbols",
      ],
      providerCounts: {
        typed_kibi_docs: 0,
        generic_repo_docs: 2,
        repo_metadata: 2,
        repo_layout: 3,
        test_topology: 2,
        source_symbols: 13,
      },
      detectedLanguages: [
        "go",
        "javascript",
        "prolog",
        "python",
        "ruby",
        "rust",
        "typescript",
      ],
      detectedTestFrameworks: ["bun:test", "vitest"],
      excludedRoots: EXCLUDED,
      truncated: false,
      scanWarnings: [
        "source_symbols:failed_to_analyze:src/broken.ts",
        "source_symbols:failed_to_analyze:src/broken2.ts",
      ],
    });
  });

  test("keeps languages from evidence metadata only when they are strings", async () => {
    const result = await discoverBootstrap(
      context(tempWorkspace(), {
        "README.md": "x",
        "Cargo.toml": "",
      }),
    );
    expect(result.summary.detectedLanguages).toStrictEqual(["rust"]);
    expect(result.summary.detectedTestFrameworks).toStrictEqual([]);
  });

  test("sorts warnings and test frameworks", async () => {
    const result = await discoverBootstrap(
      context(tempWorkspace(), {
        "README.md": "x",
        "a.ts": undefined as unknown as string,
        "package.json": "{",
        "a.test.ts": 'import "node:test";\n',
        "b.test.ts": 'import "bun:test";\n',
      }),
    );
    expect(result.summary.scanWarnings).toStrictEqual([
      "repo_metadata:failed_to_parse:package.json",
      "source_symbols:failed_to_analyze:a.ts",
    ]);
    expect(result.summary.detectedTestFrameworks).toStrictEqual([
      "bun:test",
      "node:test",
    ]);
  });

  test("runs no provider in a vendored-only posture", async () => {
    const result = await discoverBootstrap(
      context(tempWorkspace(), { "kibi/README.md": "x", "kibi/src/a.ts": "" }),
    );
    expect(result.activation.activationMode).toBe("vendored_blocked");
    expect(result.evidence).toStrictEqual([]);
    expect(result.summary.providersRun).toStrictEqual([]);
    expect(result.summary.providerCounts).toStrictEqual({
      typed_kibi_docs: 0,
      generic_repo_docs: 0,
      repo_metadata: 0,
      repo_layout: 0,
      test_topology: 0,
      source_symbols: 0,
    });
    expect(result.summary.detectedLanguages).toStrictEqual([]);
  });

  test("omits the handoff message when the activation has none", async () => {
    const root = tempWorkspace({ ".kb/manifest.json": "{" });
    const result = await discoverBootstrap(context(root, { "README.md": "x" }));
    expect(result.activation.activationState).toBe("root_partial");
    expect("handoffMessage" in result.summary).toBe(false);
    expect(result.migrationWarning).toBe(
      "Kibi lifecycle manifest at .kb/manifest.json is not valid JSON; re-run 'kibi init'.",
    );
  });

  test("has no migration warning for a current manifest", async () => {
    const root = tempWorkspace({ ".kb/manifest.json": MANIFEST });
    const result = await discoverBootstrap(
      context(root, { "README.md": "x" }, { statOk: true }),
    );
    expect(result.activation.activationState).toBe("root_active_thin");
    expect(result.migrationWarning).toBeNull();
  });

  test("an unreadable manifest status gives no migration warning", async () => {
    spies.push(
      spyOn(kbManifest, "readKbManifestStatus").mockImplementation(() => {
        throw new Error("manifest unreadable");
      }),
    );
    spies.push(
      spyOn(activation, "classifyActivation").mockResolvedValue(
        activation.legacyKbActivation(),
      ),
    );
    const root = tempWorkspace();
    const result = await discoverBootstrap(
      context(root, { "kibi/README.md": "x" }),
    );
    expect(result.migrationWarning).toBeNull();
  });

  test("keeps only string languages and frameworks from evidence metadata", async () => {
    spies.push(
      spyOn(discoveryEvidence, "scanEvidence").mockResolvedValue({
        files: ["README.md"],
        ignoredSources: [],
        warnings: [],
        evidence: [
          {
            provider: "test_topology",
            kind: "test_topology",
            label: "a.test.ts",
            data: { frameworks: [1, "jest"], languages: [2, "zig"] },
          },
          {
            provider: "repo_metadata",
            kind: "repo_metadata",
            label: "x.json",
            data: { frameworks: "jest", languages: "zig" },
          },
        ],
      }),
    );
    const result = await discoverBootstrap(
      context(tempWorkspace(), { "README.md": "x" }),
    );
    expect(result.summary.detectedTestFrameworks).toStrictEqual(["jest"]);
    expect(result.summary.detectedLanguages).toStrictEqual(["zig"]);
  });
});
