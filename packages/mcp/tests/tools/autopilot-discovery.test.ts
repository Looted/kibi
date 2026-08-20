import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";

type ActivationPolicy = {
  activationState: "root_uninitialized";
  activationMode: "cold_start_bootstrap";
  applyBlocked: false;
  allowCandidateGeneration: true;
  reason: string;
};

type SymbolAnalysis = {
  sourceFile: string;
  language: string;
  providerId: string | null;
  module: { title: string; analysisMode: string; fallbackReason?: string };
  symbols: Array<{ name: string; kind: string }>;
};

function analyzeSourceTextForTest(
  filePath: string,
  content: string,
): SymbolAnalysis {
  const symbols = Array.from(
    content.matchAll(/export\s+(?:function|const)\s+([A-Za-z_$][\w$]*)/g),
    (match) => ({ name: match[1] ?? "anonymous", kind: "export" }),
  );
  const title = path.basename(filePath, path.extname(filePath)) || filePath;
  return {
    sourceFile: filePath,
    language: "typescript",
    providerId: "test-symbol-analyzer",
    module: { title, analysisMode: "parser" },
    symbols,
  };
}

const analyzeSourceTextCurrent:
  | ((filePath: string, content: string) => SymbolAnalysis)
  | undefined = analyzeSourceTextForTest;
const symbolCoordinatorMock: {
  readonly analyzeSourceText?: (
    filePath: string,
    content: string,
  ) => SymbolAnalysis;
} = {};
Object.defineProperty(symbolCoordinatorMock, "analyzeSourceText", {
  enumerable: true,
  get: () => analyzeSourceTextCurrent,
});

mock.module(
  "kibi-cli/extractors/symbols-coordinator",
  () => symbolCoordinatorMock,
);
const {
  classifyActivationState,
  collectMarkdownFiles,
  discoverProviderEvidence,
  discoverSources,
  resolveActivationPolicy,
} = await import("../../src/tools/autopilot-discovery");
import {
  createColdStartRepo,
  createMultiRootRepo,
  createNoisyRepo,
  createPartialRepo,
  createSeededRepo,
  createThinRepo,
  createVendoredTree,
  setupWorkspace,
  writeRootManifest,
} from "./autopilot-workspace-fixture";

describe("autopilot discovery", () => {
  let fixture: ReturnType<typeof setupWorkspace> | null = null;

  function summaryExtras(summary: unknown): {
    activationMode?: string;
    handoffMessage?: string;
    reason?: string;
  } {
    return summary as {
      activationMode?: string;
      handoffMessage?: string;
      reason?: string;
    };
  }

  function createPrologStub(json: string): PrologProcess {
    return {
      query: async () => ({
        success: true,
        bindings: { JsonString: json },
      }),
    } as unknown as PrologProcess;
  }

  function createEmptyPrologStub(): PrologProcess {
    return createPrologStub(JSON.stringify({ rows: [] }));
  }

  function createFailingPrologStub(): PrologProcess {
    return {
      query: async () => {
        throw new Error("prolog unavailable");
      },
    } as unknown as PrologProcess;
  }

  function coldStartActivation(): ActivationPolicy {
    return {
      activationState: "root_uninitialized",
      activationMode: "cold_start_bootstrap",
      applyBlocked: false,
      allowCandidateGeneration: true,
      reason: "test cold start",
    };
  }

  beforeEach(() => {
    fixture = setupWorkspace();
  });

  afterEach(() => {
    if (fixture) {
      fixture.cleanup();
      fixture = null;
    }
  });

  it("formats source module analysis when source files have no symbols", () => {
    if (!fixture) throw new Error("missing fixture");
    fs.mkdirSync(path.join(fixture.root, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture.root, "src", "plain.ts"),
      "export {};\n",
    );

    const discovery = discoverProviderEvidence(
      fixture.root,
      coldStartActivation(),
    );
    const sourceEvidence = discovery.evidence.find(
      (item) => item.relativePath === "src/plain.ts",
    );

    expect(typeof sourceEvidence?.data.analysisMode).toBe("string");
    expect(sourceEvidence?.data.symbolCount).toBe(0);
  });

  it("classifies vendored_only when no root config and vendored tree exists", async () => {
    if (!fixture) throw new Error("missing fixture");
    createVendoredTree(fixture.root);

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("vendored_only");
    expect(activation.activationMode).toBe("vendored_blocked");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(discovered.candidates.length).toBe(0);
    expect(summary.reason?.toLowerCase()).toContain("vendored");
  });

  it("maps root_uninitialized to cold_start_bootstrap and scans full evidence without noisy dirs", async () => {
    if (!fixture) throw new Error("missing fixture");
    createColdStartRepo(fixture.root);
    createNoisyRepo(fixture.root);
    fs.mkdirSync(path.join(fixture.root, "packages", "app", "docs"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(fixture.root, "README.md"),
      "# ADR: Bootstrap\n",
    );
    fs.writeFileSync(
      path.join(fixture.root, "packages", "app", "docs", "overview.md"),
      "# Requirements\n",
    );

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_uninitialized");
    expect(activation.activationMode).toBe("cold_start_bootstrap");
    expect(activation.applyBlocked).toBe(false);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(summary.activationMode).toBe("cold_start_bootstrap");
    expect(discovered.candidates).toContain("README.md");
    expect(discovered.candidates).toContain("packages/app/docs/overview.md");
    expect(discovered.candidates).not.toContain("vendor/README.md");
  });

  it("maps root_partial to repair_bootstrap and keeps discovery review-only", async () => {
    if (!fixture) throw new Error("missing fixture");
    createPartialRepo(fixture.root);

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_partial");
    expect(activation.activationMode).toBe("repair_bootstrap");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(summary.activationMode).toBe("repair_bootstrap");
    expect(discovered.candidates).toContain(
      ".kb/requirements/REQ-PARTIAL-001.md",
    );
    expect(discovered.candidates).toContain("docs/bootstrap.md");
  });

  it("maps root_active_thin to explicit thin handoff for noisy multi-root repos", async () => {
    if (!fixture) throw new Error("missing fixture");
    createThinRepo(fixture.root, { multiRoot: true, noisy: true });

    const fakeProlog = createPrologStub(
      JSON.stringify({
        rows: [
          { id: "req", type: "req", count: 1 },
          { id: "scenario", type: "scenario", count: 0 },
          { id: "test", type: "test", count: 0 },
        ],
      }),
    );

    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_active_thin");
    expect(activation.activationMode).toBe("attached_thin_handoff");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(discovered.candidates).toEqual([]);
    expect(summary.handoffMessage?.toLowerCase()).toContain("thin");
  });

  it("maps root_active_seeded to explicit seeded handoff", async () => {
    if (!fixture) throw new Error("missing fixture");
    createSeededRepo(fixture.root);

    const fakeProlog = createPrologStub(
      JSON.stringify({
        rows: [
          { id: "req", type: "req", count: 2 },
          { id: "scenario", type: "scenario", count: 1 },
          { id: "test", type: "test", count: 1 },
          { id: "adr", type: "adr", count: 1 },
          { id: "fact", type: "fact", count: 1 },
        ],
      }),
    );

    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_active_seeded");
    expect(activation.activationMode).toBe("attached_seeded_handoff");
    expect(activation.applyBlocked).toBe(true);

    const discovered = discoverSources(fixture.root, activation);
    const summary = summaryExtras(discovered.summary);
    expect(discovered.candidates).toEqual([]);
    expect(summary.reason?.toLowerCase()).toContain("seeded");
  });

  it("respects .gitignore and shared denylist when discovering markdown", async () => {
    if (!fixture) throw new Error("missing fixture");

    // Create standard docs and a few ignored/secret files
    // ensureDocs creates .kb/requirements etc.
    setupWorkspace(); // no-op for typing; ensure fixture present
    // create docs
    // use helper to ensure docs structure
    // The fixture helpers expose ensureDocs via import file; call createThinRepo to populate docs
    // createThinRepo writes documentation and root config; we prefer minimal docs without root .kb
    // Use ensureDir + write files directly
    fs.mkdirSync(path.join(fixture.root, ".kb", "requirements"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(fixture.root, ".kb", "requirements", "REQ-KEEP.md"),
      [
        "---",
        "id: REQ-KEEP",
        "title: Keep",
        "status: open",
        "---",
        "# Keep",
        "",
      ].join("\n"),
    );

    // create a gitignored private doc
    fs.mkdirSync(path.join(fixture.root, "documentation", "private"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(fixture.root, "documentation", "private", "SECRET.md"),
      "# secret\n",
    );

    // create a .sisyphus draft which should be hard-denied
    fs.mkdirSync(path.join(fixture.root, ".sisyphus", "drafts"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        fixture.root,
        ".sisyphus",
        "drafts",
        "kibi-kb-quality-audit.md",
      ),
      "# draft\n",
    );

    // write .gitignore to ignore private docs
    fs.writeFileSync(
      path.join(fixture.root, ".gitignore"),
      "documentation/private/*.md\n",
    );

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_uninitialized");
    expect(activation.activationMode).toBe("cold_start_bootstrap");

    const discovered = discoverSources(fixture.root, activation);
    // Keep doc should be discovered
    expect(discovered.candidates).toContain(".kb/requirements/REQ-KEEP.md");
    // Gitignored private doc should NOT be discovered
    expect(discovered.candidates).not.toContain(
      "documentation/private/SECRET.md",
    );
    // .sisyphus drafts should be excluded by hard denylist
    expect(discovered.candidates).not.toContain(
      ".sisyphus/drafts/kibi-kb-quality-audit.md",
    );
  });

  it("respects nested .gitignore files when discovering markdown", async () => {
    if (!fixture) throw new Error("missing fixture");

    // create a docs tree with a nested .gitignore that ignores a file
    fs.mkdirSync(path.join(fixture.root, "docs"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture.root, "docs", "public.md"),
      "# Public\n",
    );
    fs.writeFileSync(
      path.join(fixture.root, "docs", "private-secret.md"),
      "# Secret\n",
    );
    // nested .gitignore in docs should ignore private-secret.md
    fs.writeFileSync(
      path.join(fixture.root, "docs", ".gitignore"),
      "private-secret.md\n",
    );

    const fakeProlog = createEmptyPrologStub();
    const state = await classifyActivationState(fixture.root, fakeProlog);
    const activation = await resolveActivationPolicy(fixture.root, fakeProlog);

    expect(state).toBe("root_uninitialized");
    expect(activation.activationMode).toBe("cold_start_bootstrap");

    const discovered = discoverSources(fixture.root, activation);
    expect(discovered.candidates).toContain("docs/public.md");
    expect(discovered.candidates).not.toContain("docs/private-secret.md");
  });

  it("treats vendored trees with root project signal directories as root workspaces", async () => {
    if (!fixture) throw new Error("missing fixture");
    createVendoredTree(fixture.root);
    fs.mkdirSync(path.join(fixture.root, "src"), { recursive: true });

    const state = await classifyActivationState(
      fixture.root,
      createEmptyPrologStub(),
    );

    expect(state).toBe("root_uninitialized");
  });

  it("ignores leftover config.json custom paths and discovers canonical .kb/ lanes", () => {
    if (!fixture) throw new Error("missing fixture");
    writeRootManifest(fixture.root);
    fs.writeFileSync(
      path.join(fixture.root, ".kb", "config.json"),
      JSON.stringify({
        paths: {
          requirements: "requirements/REQ-SHORT-001.md",
          symbols: "docs/symbols.yaml",
        },
      }),
    );
    fs.mkdirSync(path.join(fixture.root, "requirements"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture.root, "requirements", "REQ-SHORT-001.md"),
      "# Requirement shorthand\n",
    );
    fs.mkdirSync(path.join(fixture.root, "docs"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture.root, "docs", "symbols.yaml"),
      "symbols: []\n",
    );
    fs.mkdirSync(path.join(fixture.root, ".kb", "requirements"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(fixture.root, ".kb", "requirements", "REQ-CANONICAL.md"),
      [
        "---",
        "id: REQ-CANONICAL",
        "title: Canonical",
        "status: open",
        "---",
        "",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(fixture.root, ".kb", "symbols.yaml"),
      "symbols: []\n",
    );

    const discovery = discoverProviderEvidence(
      fixture.root,
      coldStartActivation(),
    );
    const typedEvidence = discovery.providerResults.find(
      (result) => result.provider === "typed_kibi_docs",
    );
    const typedPaths = typedEvidence?.evidence.map((item) => item.relativePath);

    expect(typedPaths).toContain(".kb/requirements/REQ-CANONICAL.md");
    expect(typedPaths).not.toContain("requirements/REQ-SHORT-001.md");
    expect(typedEvidence?.evidence).toContainEqual(
      expect.objectContaining({
        kind: "symbol_manifest",
        relativePath: ".kb/symbols.yaml",
      }),
    );
    expect(typedEvidence?.evidence).not.toContainEqual(
      expect.objectContaining({
        kind: "symbol_manifest",
        relativePath: "docs/symbols.yaml",
      }),
    );
  });

  it("detects metadata languages from package scripts, bin strings, cargo, go, and pyproject", () => {
    if (!fixture) throw new Error("missing fixture");
    fs.writeFileSync(
      path.join(fixture.root, "package.json"),
      JSON.stringify(
        {
          name: "metadata-languages",
          bin: "./src/cli.ts",
          scripts: {
            build: "node ./scripts/build.js",
          },
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(path.join(fixture.root, "Cargo.toml"), "[package]\n");
    fs.writeFileSync(
      path.join(fixture.root, "go.mod"),
      "module example.com/app\n",
    );
    fs.writeFileSync(path.join(fixture.root, "pyproject.toml"), "[project]\n");

    const discovery = discoverProviderEvidence(
      fixture.root,
      coldStartActivation(),
    );

    expect(discovery.summary.detectedLanguages).toEqual(
      expect.arrayContaining([
        "go",
        "javascript",
        "python",
        "rust",
        "typescript",
      ]),
    );
  });

  it("records scan warnings for invalid package metadata", () => {
    if (!fixture) throw new Error("missing fixture");
    fs.writeFileSync(path.join(fixture.root, "package.json"), "{ broken json");

    const discovery = discoverProviderEvidence(
      fixture.root,
      coldStartActivation(),
    );

    expect(discovery.summary.scanWarnings).toContain(
      "repo_metadata:failed_to_parse:package.json",
    );
  });

  it("records scan warnings when test and source files cannot be read", () => {
    if (!fixture) throw new Error("missing fixture");
    fs.mkdirSync(path.join(fixture.root, "tests"), { recursive: true });
    fs.mkdirSync(path.join(fixture.root, "src"), { recursive: true });
    const testFile = path.join(fixture.root, "tests", "unreadable.test.ts");
    const sourceFile = path.join(fixture.root, "src", "unreadable.ts");
    fs.writeFileSync(testFile, 'import { test } from "bun:test";\n');
    fs.writeFileSync(sourceFile, "export const unreadable = true;\n");
    const originalReadFileSync = fs.readFileSync;
    fs.readFileSync = ((filePath: fs.PathLike, ...args: unknown[]) => {
      const normalizedPath = path.resolve(String(filePath));
      if (
        normalizedPath === path.resolve(testFile) ||
        normalizedPath === path.resolve(sourceFile)
      ) {
        const error = new Error("permission denied") as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      }
      return Reflect.apply(originalReadFileSync, fs, [
        filePath,
        ...args,
      ] as Parameters<typeof fs.readFileSync>);
    }) as typeof fs.readFileSync;

    try {
      const discovery = discoverProviderEvidence(
        fixture.root,
        coldStartActivation(),
      );

      expect(discovery.summary.scanWarnings).toEqual(
        expect.arrayContaining([
          "source_symbols:failed_to_analyze:src/unreadable.ts",
          "test_topology:failed_to_read:tests/unreadable.test.ts",
        ]),
      );
    } finally {
      fs.readFileSync = originalReadFileSync;
    }
  });

  it("falls back to thin activation when Prolog coverage cannot be queried", async () => {
    if (!fixture) throw new Error("missing fixture");
    createThinRepo(fixture.root);

    const state = await classifyActivationState(
      fixture.root,
      createFailingPrologStub(),
    );

    expect(state).toBe("root_active_thin");
  });

  it("collects markdown recursively while skipping ignored and vendored directories", () => {
    if (!fixture) throw new Error("missing fixture");
    fs.mkdirSync(path.join(fixture.root, "docs", "nested"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(fixture.root, "docs", "node_modules"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(fixture.root, "vendored", "docs"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(fixture.root, "docs", "root.md"), "# Root\n");
    fs.writeFileSync(
      path.join(fixture.root, "docs", "nested", "child.md"),
      "# Child\n",
    );
    fs.writeFileSync(
      path.join(fixture.root, "docs", "nested", "note.txt"),
      "not markdown\n",
    );
    fs.writeFileSync(
      path.join(fixture.root, "docs", "node_modules", "ignored.md"),
      "# Ignored\n",
    );
    fs.writeFileSync(
      path.join(fixture.root, "vendored", "docs", "ignored.md"),
      "# Vendored\n",
    );
    expect(
      collectMarkdownFiles(fixture.root, fixture.root, ["vendored"]),
    ).toEqual(["docs/nested/child.md", "docs/root.md"]);
    expect(
      collectMarkdownFiles(
        path.join(fixture.root, "docs", "root.md"),
        fixture.root,
        [],
      ),
    ).toEqual([]);
    expect(
      collectMarkdownFiles(
        path.join(fixture.root, "missing"),
        fixture.root,
        [],
      ),
    ).toEqual([]);
  });
});
