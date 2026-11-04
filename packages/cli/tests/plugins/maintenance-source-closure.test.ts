// executable_for TEST-source-analysis-v2-contract
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ProjectKibiConfig } from "kibi-plugin-sdk";
import type { ApprovedSourceAnalyzer } from "../../src/plugins/approved-source-analyzers.js";
import {
  builtinRuntimeIdentity,
  createMaintenanceSourceAnalysisService,
  fingerprintMaintenanceSourceSet,
  languagePackWaiver,
  readSnapshotSourceConfig,
  verifyApprovedSourceAnalyzer,
} from "../../src/plugins/maintenance-source-analysis.js";
import type { GitChangeSnapshot } from "../../src/traceability/git-change-snapshot.js";
import { fingerprint } from "../../src/traceability/impact-review.js";

const SYMBOLS = "kibi.symbol-extractor.v2";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function temporary(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-maint-src-")));
  roots.push(root);
  return root;
}

function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function hashes(dir: string, files: string[]): Record<string, string> {
  return Object.fromEntries(
    files.map((file) => [
      file,
      createHash("sha256")
        .update(readFileSync(join(dir, file)))
        .digest("hex"),
    ]),
  );
}

function failure(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a failure");
}

const PLUGIN = (name: string) => `export const kibiPlugin = {
  apiVersion: "kibi.plugin.v1",
  id: ${JSON.stringify(name)},
  version: "1.0.0",
  permissions: { network: false, metered: false, secrets: [] },
  capabilities: {
    symbolExtractorV2: {
      id: "${name}.symbols",
      supports: () => true,
      analyze: (input) =>
        input.path.endsWith(".rs")
          ? {
              contractVersion: "kibi.symbol-extractor.v2",
              status: "unsupported",
              sourceFile: input.path,
              language: "rust",
              module: {
                title: "a",
                language: "rust",
                analysisMode: "fallback",
                fallbackReason: "unsupported_language",
              },
              symbols: [],
              diagnostics: [
                {
                  code: "TREESITTER_LANGUAGE_PACK_MISSING",
                  message: "Install kibi-lang-rust to read this file",
                },
              ],
              uncoveredRanges: [],
            }
          : {
              contractVersion: "kibi.symbol-extractor.v2",
              status: "ok",
              sourceFile: input.path,
              language: "python",
              module: { title: "a", language: "python", analysisMode: "parser" },
              symbols: [],
              diagnostics: [],
              uncoveredRanges: [],
            },
    },
  },
};
`;

/** A workspace with analyzer packages installed, each with its approval. */
function workspace(names: string[]): {
  root: string;
  approvals: ApprovedSourceAnalyzer[];
  config: ProjectKibiConfig;
} {
  const root = temporary();
  write(
    join(root, "package.json"),
    JSON.stringify({
      name: "ws",
      devDependencies: Object.fromEntries(names.map((n) => [n, "1.0.0"])),
    }),
  );
  const approvals = names.map((name) => {
    const dir = join(root, "node_modules", name);
    write(
      join(dir, "package.json"),
      JSON.stringify({
        name,
        version: "1.0.0",
        type: "module",
        main: "dist/index.js",
      }),
    );
    write(join(dir, "dist", "index.js"), PLUGIN(name));
    return {
      packageName: name,
      version: "1.0.0",
      files: hashes(dir, ["package.json", "dist/index.js"]),
      dependencies: [],
    };
  });
  const config: ProjectKibiConfig = {
    plugins: names.map((name) => ({
      package: name,
      capabilities: { [SYMBOLS]: { mode: "augment" } },
    })),
  };
  return { root, approvals, config };
}

function approvalHash(approval: ApprovedSourceAnalyzer): string {
  return createHash("sha256").update(JSON.stringify(approval)).digest("hex");
}

describe("verifyApprovedSourceAnalyzer", () => {
  function analyzer(root: string, manifest: object = {}) {
    write(
      join(root, "package.json"),
      JSON.stringify({ name: "qualified", version: "1.0.0", ...manifest }),
    );
    write(join(root, "entry.js"), "export {};\n");
    return {
      packageName: "qualified",
      version: "1.0.0",
      files: hashes(root, ["entry.js"]),
      dependencies: [] as ApprovedSourceAnalyzer["dependencies"][number][],
    };
  }

  test("returns the digest of the approval it verified", () => {
    const root = temporary();
    const approval = analyzer(root);
    expect(verifyApprovedSourceAnalyzer(root, approval)).toBe(
      approvalHash(approval),
    );
  });

  test("rejects asset paths that leave or name the package root", () => {
    const root = temporary();
    const approval = analyzer(root);
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(root, {
          ...approval,
          files: { "../entry.js": "x" },
        }),
      ),
    ).toBe("Invalid approved asset path: ../entry.js");
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(root, { ...approval, files: { "": "x" } }),
      ),
    ).toBe("Invalid approved asset path: ");
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(root, {
          ...approval,
          files: { "entry.js": "0" },
        }),
      ),
    ).toBe("Source analyzer integrity mismatch: entry.js");
  });

  test("accepts asset names that merely start with dots", () => {
    const root = temporary();
    write(join(root, "package.json"), '{"name":"q","version":"1"}');
    write(join(root, "..entry.js"), "x");
    const approval = {
      packageName: "q",
      version: "1",
      files: hashes(root, ["..entry.js"]),
      dependencies: [],
    };
    // A file named "..entry.js" sits inside the package but its relative
    // path starts with "..", which the guard treats as an escape.
    expect(failure(() => verifyApprovedSourceAnalyzer(root, approval))).toBe(
      "Invalid approved asset path: ..entry.js",
    );
  });

  test("rejects a package whose name or version differs from the approval", () => {
    const root = temporary();
    const approval = analyzer(root);
    const mismatch =
      "Source analyzer package identity does not match host approval";
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(root, { ...approval, packageName: "x" }),
      ),
    ).toBe(mismatch);
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(root, { ...approval, version: "2.0.0" }),
      ),
    ).toBe(mismatch);
  });

  test("verifies each dependency's closure and version", () => {
    const root = temporary();
    const pkg = join(root, "node_modules", "qualified");
    const approval = analyzer(pkg);
    const dep = join(root, "node_modules", "runtime-dep");
    write(
      join(dep, "package.json"),
      JSON.stringify({
        name: "runtime-dep",
        version: "2.0.0",
        main: "dist/i.js",
      }),
    );
    // A nested manifest of another name is walked past.
    write(join(dep, "dist", "package.json"), '{"name":"dist-only"}');
    write(join(dep, "dist", "i.js"), "module.exports = 1;\n");
    const dependency = {
      packageName: "runtime-dep",
      version: "2.0.0",
      files: hashes(dep, ["dist/i.js"]),
    };
    const full = { ...approval, dependencies: [dependency] };
    expect(verifyApprovedSourceAnalyzer(pkg, full)).toBe(approvalHash(full));
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(pkg, {
          ...approval,
          dependencies: [{ ...dependency, version: "3.0.0" }],
        }),
      ),
    ).toBe("Unapproved source runtime version: runtime-dep");
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(pkg, {
          ...approval,
          dependencies: [{ ...dependency, files: { "dist/i.js": "0" } }],
        }),
      ),
    ).toBe("Source analyzer integrity mismatch: dist/i.js");
  });

  test("resolves a dependency from the analyzer's own node_modules first", () => {
    const root = temporary();
    const pkg = join(root, "node_modules", "qualified");
    const approval = analyzer(pkg);
    for (const [dir, version] of [
      [join(pkg, "node_modules", "runtime-dep"), "2.0.0"],
      [join(root, "node_modules", "runtime-dep"), "1.0.0"],
    ] as const) {
      write(
        join(dir, "package.json"),
        JSON.stringify({ name: "runtime-dep", version, main: "i.js" }),
      );
      write(join(dir, "i.js"), "module.exports = 1;\n");
    }
    const full = {
      ...approval,
      dependencies: [
        {
          packageName: "runtime-dep",
          version: "2.0.0",
          files: hashes(join(pkg, "node_modules", "runtime-dep"), ["i.js"]),
        },
      ],
    };
    expect(verifyApprovedSourceAnalyzer(pkg, full)).toBe(approvalHash(full));
  });

  test("fails when no ancestor manifest names the dependency", () => {
    const root = temporary();
    const pkg = join(root, "node_modules", "qualified");
    const approval = analyzer(pkg);
    const dep = join(root, "node_modules", "kibi-unnamed-dep-z");
    write(join(dep, "package.json"), '{"name":"renamed","main":"i.js"}');
    write(join(dep, "i.js"), "module.exports = 1;\n");
    expect(
      failure(() =>
        verifyApprovedSourceAnalyzer(pkg, {
          ...approval,
          dependencies: [
            { packageName: "kibi-unnamed-dep-z", version: "1", files: {} },
          ],
        }),
      ),
    ).toBe("Cannot locate approved dependency: kibi-unnamed-dep-z");
  });
});

describe("builtinRuntimeIdentity", () => {
  test("reads the installed builtin analyzer's identity", () => {
    const manifest = createRequire(import.meta.url)(
      "kibi-plugin-builtin/package.json",
    ) as { name: string; version: string };
    expect(builtinRuntimeIdentity()).toStrictEqual({
      name: "kibi-plugin-builtin",
      version: manifest.version,
    });
  });

  test("returns only the name and version of a valid manifest", () => {
    expect(
      builtinRuntimeIdentity({
        name: "kibi-plugin-builtin",
        version: "9.9.9",
        extra: true,
      } as never),
    ).toStrictEqual({ name: "kibi-plugin-builtin", version: "9.9.9" });
  });

  test("rejects another package or a missing version", () => {
    const invalid = "Builtin source analyzer identity is invalid";
    expect(
      failure(() => builtinRuntimeIdentity({ name: "other", version: "1" })),
    ).toBe(invalid);
    expect(
      failure(() =>
        builtinRuntimeIdentity({ name: "kibi-plugin-builtin", version: 1 }),
      ),
    ).toBe(invalid);
  });
});

describe("fingerprintMaintenanceSourceSet", () => {
  test("binds sorted source analyzers to their verified approvals", () => {
    const { root, approvals, config } = workspace(["zeta-src", "alpha-src"]);
    const withOthers: ProjectKibiConfig = {
      plugins: [
        ...(config.plugins ?? []),
        {
          package: "classifier-only",
          capabilities: { "kibi.semantic-classifier.v1": { mode: "replace" } },
        },
      ],
    };
    const [zeta, alpha] = approvals as [
      ApprovedSourceAnalyzer,
      ApprovedSourceAnalyzer,
    ];
    expect(fingerprintMaintenanceSourceSet(root, withOthers, approvals)).toBe(
      fingerprint({
        contractVersion: "kibi.maintenance-source-set.v2",
        builtinRuntime: builtinRuntimeIdentity(),
        sdkContract: SYMBOLS,
        bindings: [
          {
            packageName: "alpha-src",
            capability: { mode: "augment" },
            approvalFingerprint: approvalHash(alpha),
          },
          {
            packageName: "zeta-src",
            capability: { mode: "augment" },
            approvalFingerprint: approvalHash(zeta),
          },
        ],
      }),
    );
  });

  test("fingerprints the builtin analyzer alone without plugins", () => {
    const expected = fingerprint({
      contractVersion: "kibi.maintenance-source-set.v2",
      builtinRuntime: builtinRuntimeIdentity(),
      sdkContract: SYMBOLS,
      bindings: [],
    });
    expect(fingerprintMaintenanceSourceSet("/unused", {})).toBe(expected);
    expect(fingerprintMaintenanceSourceSet("/unused", { plugins: [] })).toBe(
      expected,
    );
  });

  test("refuses an unapproved analyzer or an entry outside its closure", () => {
    const { root, approvals, config } = workspace(["alpha-src"]);
    expect(
      failure(() => fingerprintMaintenanceSourceSet(root, config, [])),
    ).toBe("Source analyzer is not approved for impact review: alpha-src");
    const [alpha] = approvals as [ApprovedSourceAnalyzer];
    expect(
      failure(() =>
        fingerprintMaintenanceSourceSet(root, config, [
          { ...alpha, files: { "package.json": "x" } },
        ]),
      ),
    ).toBe("Source analyzer entrypoint is outside its approved closure");
    expect(
      failure(() =>
        fingerprintMaintenanceSourceSet(root, config, [
          { ...alpha, packageName: "other" },
          { ...alpha, files: { "dist/index.js": "0" } },
        ]),
      ),
    ).toBe("Source analyzer integrity mismatch: dist/index.js");
  });
});

describe("Windows-style entry paths", () => {
  /** An analyzer whose entry path holds a backslash separator. */
  function backslashed() {
    const { root, approvals, config } = workspace(["alpha-src"]);
    const dir = join(root, "node_modules", "alpha-src");
    write(
      join(dir, "package.json"),
      JSON.stringify({
        name: "alpha-src",
        version: "1.0.0",
        type: "module",
        // Node cannot resolve an import-only export, so the manifest path
        // is taken verbatim, backslash included.
        exports: { ".": { import: "./dist/a\\b.js" } },
      }),
    );
    write(join(dir, "dist", "a\\b.js"), PLUGIN("alpha-src"));
    write(join(dir, "dist", "a", "b.js"), PLUGIN("alpha-src"));
    const [alpha] = approvals as [ApprovedSourceAnalyzer];
    const approval = {
      ...alpha,
      files: hashes(dir, ["package.json", "dist/a/b.js"]),
    };
    return { root, config, approval };
  }

  test("match the closure with forward slashes when fingerprinting", () => {
    const { root, config, approval } = backslashed();
    expect(
      fingerprintMaintenanceSourceSet(root, config, [approval]),
    ).toStartWith("sha256:");
  });

  test("match the closure with forward slashes before analysis", async () => {
    const { root, config, approval } = backslashed();
    const result = await createMaintenanceSourceAnalysisService(root, config, [
      approval,
    ]).analyzeTextV2("a.py", "pass\n");
    // The closure check passes; only then is the entry imported, which the
    // POSIX host cannot do for a backslash path.
    expect(result.diagnostics[0]?.message).toContain(
      "Failed to import plugin package 'alpha-src'",
    );
  });
});

describe("createMaintenanceSourceAnalysisService", () => {
  test("runs a verified analyzer with its approval fingerprint", async () => {
    const { root, approvals, config } = workspace(["alpha-src"]);
    const result = await createMaintenanceSourceAnalysisService(
      root,
      config,
      approvals,
    ).analyzeTextV2("a.py", "pass\n");
    expect(result.diagnostics).toStrictEqual([]);
    expect(result.status).toBe("ok");
    expect(result.providerId).toBe("alpha-src.symbols");
    expect(result.providerFingerprint).toBe(
      approvalHash(approvals[0] as ApprovedSourceAnalyzer),
    );
  });

  test("reads the workspace configuration when none is given", async () => {
    const { root, approvals, config } = workspace(["alpha-src"]);
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    );
    write(
      join(root, "package.json"),
      JSON.stringify({ ...manifest, kibi: config }),
    );
    const result = await createMaintenanceSourceAnalysisService(
      root,
      undefined,
      approvals,
    ).analyzeTextV2("a.py", "pass\n");
    expect(result.providerId).toBe("alpha-src.symbols");
  });

  test("works without configured plugins", async () => {
    const root = temporary();
    const result = await createMaintenanceSourceAnalysisService(
      root,
      {},
    ).analyzeTextV2("a.py", "pass\n");
    expect(result.status).toBe("unsupported");
    expect(result.providerId).toBeNull();
  });

  test("fails analysis for an unapproved or unqualified analyzer", async () => {
    const { root, approvals, config } = workspace(["alpha-src"]);
    const [alpha] = approvals as [ApprovedSourceAnalyzer];
    const run = async (list: ApprovedSourceAnalyzer[]) => {
      const result = await createMaintenanceSourceAnalysisService(
        root,
        config,
        list,
      ).analyzeTextV2("a.py", "pass\n");
      return { status: result.status, message: result.diagnostics[0]?.message };
    };
    expect(await run([{ ...alpha, packageName: "other" }])).toStrictEqual({
      status: "failed",
      message:
        "Error: Source analyzer is not approved for maintenance: alpha-src",
    });
    expect(
      await run([{ ...alpha, files: { "package.json": "x" } }]),
    ).toStrictEqual({
      status: "failed",
      message:
        "Error: Source analyzer entrypoint is outside its approved closure",
    });
    expect(
      await run([{ ...alpha, files: { "dist/index.js": "0" } }]),
    ).toStrictEqual({
      status: "failed",
      message: "Error: Source analyzer integrity mismatch: dist/index.js",
    });
  });

  test("waives a missing pack the configuration declined", async () => {
    const { root, approvals, config } = workspace(["alpha-src"]);
    const analyze = (declined: string[]) =>
      createMaintenanceSourceAnalysisService(
        root,
        { ...config, declinedLanguagePacks: declined },
        approvals,
      ).analyzeTextV2("src/a.rs", "fn main() {}\n");
    expect(JSON.stringify(await analyze(["kibi-lang-rust"]))).toContain(
      "kibi-lang-rust is listed in package.json kibi.declinedLanguagePacks, so no grammar reads src/a.rs",
    );
    expect(JSON.stringify(await analyze([]))).not.toContain(
      "declinedLanguagePacks",
    );
  });
});

describe("languagePackWaiver", () => {
  test("names a declined pack before anything else", () => {
    const root = temporary();
    const waiver = languagePackWaiver(root, {
      declinedLanguagePacks: ["kibi-lang-go"],
      generatedPaths: ["gen/**"],
    });
    expect(waiver("gen/a.go", "", "kibi-lang-go")).toBe(
      "kibi-lang-go is listed in package.json kibi.declinedLanguagePacks, so no grammar reads gen/a.go",
    );
    expect(waiver("gen/a.rs", "", "kibi-lang-rust")).toBe(
      "gen/a.rs is generated (linguist-generated or a generator header), so it does not need kibi-lang-rust",
    );
  });

  test("recognises a generator header without configured paths", () => {
    const root = temporary();
    const waiver = languagePackWaiver(root, {});
    expect(
      waiver(
        "src/a.go",
        "// Code generated by tool. DO NOT EDIT.\npackage a\n",
        "kibi-lang-go",
      ),
    ).toBe(
      "src/a.go is generated (linguist-generated or a generator header), so it does not need kibi-lang-go",
    );
    expect(waiver("src/a.go", "package a\n", "kibi-lang-go")).toBeNull();
    expect(waiver("gen/a.go", "package a\n", "kibi-lang-go")).toBeNull();
  });
});

const ACTIVE = {
  package: "active-src",
  capabilities: { [SYMBOLS]: { mode: "augment" as const } },
};
const SHADOW = {
  package: "active-src",
  capabilities: { [SYMBOLS]: { mode: "shadow" as const } },
};

/** A snapshot whose trees hold these package.json kibi sections. */
function snapshot(
  trees: Record<string, Record<string, unknown> | null | "symlink">,
  changed: string[],
  calls: string[][] = [],
): GitChangeSnapshot {
  return {
    headTree: "head",
    baseTree: "base",
    inventory: changed.map((file) => ({ path: file })),
    readGit: (args: string[]) => {
      calls.push(args);
      if (args[0] === "ls-tree") {
        const kibi = trees[args[1] as string];
        if (kibi === null) return Buffer.from("");
        return Buffer.from(
          kibi === "symlink"
            ? "120000 blob 0123\tpackage.json\n"
            : "100755 blob 0123\tpackage.json\n",
        );
      }
      if (args[0] !== "show") throw new Error(`unexpected ${args.join(" ")}`);
      const [tree, file] = (args[1] as string).split(":") as [string, string];
      if (file !== "package.json") throw new Error(`unexpected ${file}`);
      return Buffer.from(JSON.stringify({ name: "p", kibi: trees[tree] }));
    },
  } as unknown as GitChangeSnapshot;
}

describe("readSnapshotSourceConfig", () => {
  test("reads only the trusted tree when one is given", () => {
    const calls: string[][] = [];
    expect(
      readSnapshotSourceConfig(
        snapshot({ trusted: { plugins: [ACTIVE] }, head: {} }, ["a.ts"], calls),
        "trusted",
      ),
    ).toStrictEqual({ plugins: [ACTIVE] });
    expect(calls).toStrictEqual([
      ["ls-tree", "trusted", "--", "package.json"],
      ["show", "trusted:package.json"],
    ]);
  });

  test("reads a tree without package.json as no configuration", () => {
    expect(
      readSnapshotSourceConfig(snapshot({ head: null }, ["package.json"])),
    ).toStrictEqual({ plugins: [] });
    expect(
      readSnapshotSourceConfig(
        snapshot({ head: null }, ["package.json"]),
        "head",
      ),
    ).toStrictEqual({});
  });

  test("refuses a package.json that is not a regular file", () => {
    expect(() =>
      readSnapshotSourceConfig(snapshot({ head: "symlink" }, [])),
    ).toThrow("Source analyzer configuration must be a regular snapshot file");
    const odd = {
      headTree: "head",
      baseTree: "base",
      inventory: [],
      readGit: () => Buffer.from("x100644 blob 0123\tpackage.json\n"),
    } as unknown as GitChangeSnapshot;
    expect(() => readSnapshotSourceConfig(odd)).toThrow(
      "Source analyzer configuration must be a regular snapshot file",
    );
  });

  test("ignores the base for configuration and knowledge-only changes", () => {
    for (const file of [
      "package.json",
      "bun.lock",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      ".kb/requirements/REQ-1.md",
    ]) {
      const calls: string[][] = [];
      expect(
        readSnapshotSourceConfig(
          snapshot({ head: {}, base: { plugins: [ACTIVE] } }, [file], calls),
        ),
      ).toStrictEqual({ plugins: [] });
      expect(calls.map((args) => args[1])).toStrictEqual([
        "head",
        "head:package.json",
      ]);
    }
  });

  test("keeps the base's active analyzers for a source change", () => {
    const other = {
      package: "other-src",
      capabilities: { [SYMBOLS]: { mode: "replace" as const } },
    };
    const classifier = {
      package: "classifier",
      capabilities: { "kibi.semantic-classifier.v1": { mode: "replace" } },
    };
    const shadowOnly = { ...SHADOW, package: "shadow-src" };
    expect(
      readSnapshotSourceConfig(
        snapshot(
          {
            head: { plugins: [other] },
            base: {
              plugins: [
                ACTIVE,
                classifier,
                shadowOnly,
                { ...other, capabilities: { [SYMBOLS]: { mode: "augment" } } },
              ],
            },
          },
          ["docs/x.kb/a.md"],
        ),
      ),
    ).toStrictEqual({ plugins: [other, ACTIVE] });
  });

  test("refuses to downgrade an active analyzer to shadow with source", () => {
    expect(() =>
      readSnapshotSourceConfig(
        snapshot({ head: { plugins: [SHADOW] }, base: { plugins: [ACTIVE] } }, [
          "src/a.ts",
        ]),
      ),
    ).toThrow(
      "Cannot downgrade active source analyzer 'active-src' to shadow while changing source; separate the configuration change",
    );
  });

  test("keeps a head shadow analyzer whose base was shadow or absent", () => {
    expect(
      readSnapshotSourceConfig(
        snapshot({ head: { plugins: [SHADOW] }, base: { plugins: [SHADOW] } }, [
          "src/a.ts",
        ]),
      ),
    ).toStrictEqual({ plugins: [SHADOW] });
    expect(
      readSnapshotSourceConfig(
        snapshot({ head: { plugins: [SHADOW] }, base: {} }, ["src/a.ts"]),
      ),
    ).toStrictEqual({ plugins: [SHADOW] });
  });

  test("counts only packs declined before a source change", () => {
    expect(
      readSnapshotSourceConfig(
        snapshot(
          {
            head: { declinedLanguagePacks: ["kibi-lang-go", "kibi-lang-rust"] },
            base: {
              declinedLanguagePacks: ["kibi-lang-rust"],
              generatedPaths: ["g/**"],
            },
          },
          ["src/a.go"],
        ),
      ),
    ).toStrictEqual({
      plugins: [],
      declinedLanguagePacks: ["kibi-lang-rust"],
      generatedPaths: ["g/**"],
    });
  });
});
