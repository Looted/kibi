import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Project } from "ts-morph";
import { extractFromManifestString } from "../../src/extractors/manifest";

type ManifestLookupRelationship = { type: string; to: string };
type ManifestLookupValue = {
  id: string;
  relationships: ManifestLookupRelationship[];
};

const SYMBOL_EXTRACT_URL = new URL(
  "../../src/traceability/symbol-extract.js",
  import.meta.url,
).href;
const tempDirs: string[] = [];
const MANIFEST_SENTINEL_PREFIX = "__manifest__:";

function loadSymbolExtractModule(tag: string) {
  return import(`${SYMBOL_EXTRACT_URL}?case=${tag}-${Math.random()}`);
}

function makeTempDir(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function makeStagedFile(
  path: string,
  content: string,
  status: "A" | "M" | "R" = "M",
) {
  return {
    path,
    content,
    hunkRanges: [{ start: 1, end: 20 }],
    status,
  };
}

function createManifestLookupFromString(content: string, manifestPath: string) {
  const entries = extractFromManifestString(content, manifestPath);

  return new Map<string, ManifestLookupValue>([
    [
      `${MANIFEST_SENTINEL_PREFIX}${manifestPath}`,
      {
        id: manifestPath,
        relationships: [],
      },
    ],
    ...entries.map((entry): [string, ManifestLookupValue] => {
      const sourceFile =
        entry.sourceFile ?? entry.entity.source ?? manifestPath;
      return [
        `${sourceFile}:${entry.entity.title}`,
        {
          id: entry.entity.id,
          relationships: entry.relationships
            .filter(
              (relationship) =>
                relationship.type === "implements" ||
                relationship.type === "covered_by",
            )
            .map((relationship) => ({
              type: relationship.type,
              to: relationship.to,
            })),
        },
      ];
    }),
  ]);
}

beforeEach(() => {
  mock.restore();
});

afterEach(() => {
  mock.restore();
  for (const dir of tempDirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("symbol-extract (real integration)", () => {
  it("infers stable symbol roles from extracted symbol kinds", async () => {
    const { extractSymbolsFromStagedFile } =
      await loadSymbolExtractModule("symbol-roles");
    const { inferSymbolRole } = await import(
      "../../src/public/symbol-granularity.js"
    );

    const symbols = extractSymbolsFromStagedFile(
      makeStagedFile(
        "src/roles.ts",
        [
          "export function runBehavior() {}",
          "export class Worker { execute() {} }",
          "export interface WorkerShape { id: string }",
          "export type WorkerAlias = WorkerShape;",
          "export enum WorkerState { Idle }",
          "export const WORKER_TOKEN = 'worker';",
        ].join("\n"),
        "A",
      ),
    );

    expect(
      symbols.map((symbol: { name: string; kind: string; role: string }) => ({
        name: symbol.name,
        kind: symbol.kind,
        role: symbol.role,
      })),
    ).toEqual([
      { name: "runBehavior", kind: "function", role: "behavioral" },
      { name: "Worker", kind: "class", role: "behavioral" },
      { name: "Worker.execute", kind: "method", role: "behavioral" },
      { name: "WorkerState", kind: "enum", role: "type-shape" },
      { name: "WorkerShape", kind: "interface", role: "type-shape" },
      { name: "WorkerAlias", kind: "type", role: "type-shape" },
      { name: "WORKER_TOKEN", kind: "variable", role: "unknown" },
    ]);
    expect(inferSymbolRole("unknown")).toBe("unknown");
  });

  it("extracts symbols across script kinds and applies inline, manifest, hunk, and hash fallbacks", async () => {
    const { extractSymbolsFromStagedFile } =
      await loadSymbolExtractModule("real-script-kinds");

    const tsDir = makeTempDir("symbol-extract-ts-");
    mkdirSync(join(tsDir, "src"), { recursive: true });
    const tsFile = join(tsDir, "src", "feature.ts");
    writeFileSync(
      join(tsDir, "src", "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-CLS",
        "    title: FeatureClass",
        "    sourceFile: src/feature.ts",
        "    links:",
        "      - REQ-MANIFEST-CLASS",
        "  - id: SYM-ENUM",
        "    title: FeatureState",
        "    sourceFile: src/feature.ts",
        "    links:",
        "      - REQ-MANIFEST-ENUM",
        "  - id: SYM-VAR",
        "    title: FEATURE_VALUE",
        "    sourceFile: src/feature.ts",
        "    links:",
        "      - REQ-MANIFEST-VAR",
      ].join("\n"),
    );

    const tsSymbols = extractSymbolsFromStagedFile({
      path: tsFile,
      content: [
        "// implements: REQ-INLINE, REQ-INLINE, REQ_2",
        "export function featureFn() {}",
        "export class FeatureClass { methodSymbol() {} }",
        "export enum FeatureState { On }",
        "export const FEATURE_VALUE = 1;",
        "",
        "export function skippedByHunk() {}",
      ].join("\n"),
      hunkRanges: [{ start: 1, end: 4 }],
      status: "M",
    });

    expect(tsSymbols.map((symbol: { name: string }) => symbol.name)).toEqual([
      "featureFn",
      "FeatureClass",
      "FeatureClass.methodSymbol",
      "FeatureState",
    ]);
    expect(tsSymbols[0]).toMatchObject({
      kind: "function",
      reqLinks: ["REQ-INLINE", "REQ_2"],
      hunkRanges: [{ start: 1, end: 4 }],
    });
    expect(tsSymbols[1]).toMatchObject({
      id: "SYM-CLS",
      kind: "class",
      reqLinks: ["REQ-MANIFEST-CLASS"],
    });
    expect(tsSymbols[2]).toMatchObject({
      kind: "method",
      name: "FeatureClass.methodSymbol",
    });
    expect(tsSymbols[3]).toMatchObject({
      id: "SYM-ENUM",
      kind: "enum",
      reqLinks: ["REQ-MANIFEST-ENUM"],
    });

    const jsDir = makeTempDir("symbol-extract-js-");
    mkdirSync(join(jsDir, "src"), { recursive: true });
    const jsFile = join(jsDir, "src", "plain.js");
    const jsSymbols = extractSymbolsFromStagedFile(
      makeStagedFile(jsFile, "export function jsSymbol() {}", "A"),
    );
    expect(jsSymbols).toHaveLength(1);
    expect(jsSymbols[0]?.name).toBe("jsSymbol");
    expect(jsSymbols[0]?.id).toHaveLength(16);

    const jsxFile = join(jsDir, "src", "view.jsx");
    const jsxSymbols = extractSymbolsFromStagedFile(
      makeStagedFile(jsxFile, "export const View = () => <div />;", "A"),
    );
    expect(jsxSymbols[0]).toMatchObject({ name: "View", kind: "variable" });

    const tsxFile = join(jsDir, "src", "widget.tsx");
    const tsxSymbols = extractSymbolsFromStagedFile(
      makeStagedFile(
        tsxFile,
        "export function Widget() { return <div />; }",
        "A",
      ),
    );
    expect(tsxSymbols[0]).toMatchObject({ name: "Widget", kind: "function" });

    const mtsFile = join(jsDir, "src", "module.mts");
    const mtsSymbols = extractSymbolsFromStagedFile(
      makeStagedFile(mtsFile, "export const moduleValue = 1;", "A"),
    );
    expect(mtsSymbols[0]).toMatchObject({
      name: "moduleValue",
      kind: "variable",
    });

    const ctsFile = join(jsDir, "src", "common.cts");
    const ctsSymbols = extractSymbolsFromStagedFile(
      makeStagedFile(ctsFile, "export enum CommonMode { On }", "R"),
    );
    expect(ctsSymbols[0]).toMatchObject({ name: "CommonMode", kind: "enum" });
  });

  it("ignores empty directive tokens when regex matches trailing whitespace", async () => {
    const { extractSymbolsFromStagedFile } = await loadSymbolExtractModule(
      "directive-empty-token",
    );
    const originalExec = RegExp.prototype.exec;
    let seenDirectiveRegex = false;

    RegExp.prototype.exec = function (text: string) {
      if (this.source.includes("implements\\s*:?\\s*") && !seenDirectiveRegex) {
        seenDirectiveRegex = true;
        return Object.assign(["implements: REQ-ONLY   ", "REQ-ONLY   "], {
          index: 0,
          input: text,
        }) as RegExpExecArray;
      }

      if (this.source.includes("implements\\s*:?\\s*") && seenDirectiveRegex) {
        return null;
      }

      return originalExec.call(this, text);
    };

    const symbols = extractSymbolsFromStagedFile(
      makeStagedFile("directive.ts", "export function directiveFn() {}", "A"),
    );

    RegExp.prototype.exec = originalExec;

    expect(symbols[0]?.reqLinks).toEqual(["REQ-ONLY"]);
  });

  it("preserves typed relationships from staged manifests while inline implements override manifest req links", async () => {
    const { extractSymbolsFromStagedFile } = await loadSymbolExtractModule(
      "staged-manifest-relationships",
    );

    const dir = makeTempDir("symbol-extract-staged-manifest-");
    const srcDir = join(dir, "src");
    mkdirSync(srcDir, { recursive: true });
    const filePath = join(srcDir, "feature.ts");

    writeFileSync(
      join(srcDir, "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-DISK-FN",
        "    title: featureFn",
        `    sourceFile: \"${filePath}\"`,
        "    links:",
        "      - REQ-DISK-FN",
        "      - type: covered_by",
        "        target: TEST-DISK-FN",
        "  - id: SYM-DISK-VAR",
        "    title: diskOnlyVar",
        `    sourceFile: \"${filePath}\"`,
        "    links:",
        "      - REQ-DISK-VAR",
      ].join("\n"),
    );

    const manifestLookup = createManifestLookupFromString(
      [
        "symbols:",
        "  - id: SYM-STAGED-FN",
        "    title: featureFn",
        `    sourceFile: \"${filePath}\"`,
        "    links:",
        "      - REQ-MANIFEST-FN",
        "      - type: covered_by",
        "        target: TEST-MANIFEST-FN",
        "  - id: SYM-STAGED-CLS",
        "    title: FeatureClass",
        `    sourceFile: \"${filePath}\"`,
        "    relationships:",
        "      - type: covered_by",
        "        target: TEST-MANIFEST-CLS",
        "      - type: implements",
        "        target: REQ-MANIFEST-CLS",
      ].join("\n"),
      join(srcDir, "symbols.yaml"),
    );

    const symbols = extractSymbolsFromStagedFile(
      makeStagedFile(
        filePath,
        [
          "// implements: REQ-INLINE-FN",
          "export function featureFn() {}",
          "export class FeatureClass {}",
          "export const diskOnlyVar = 1;",
        ].join("\n"),
        "A",
      ),
      manifestLookup,
    );

    expect(symbols).toHaveLength(3);
    expect(symbols[0]).toMatchObject({
      id: "SYM-STAGED-FN",
      name: "featureFn",
      reqLinks: ["REQ-INLINE-FN"],
      relationships: [
        { type: "implements", to: "REQ-MANIFEST-FN" },
        { type: "covered_by", to: "TEST-MANIFEST-FN" },
      ],
    });
    expect(symbols[1]).toMatchObject({
      id: "SYM-STAGED-CLS",
      name: "FeatureClass",
      reqLinks: ["REQ-MANIFEST-CLS"],
      relationships: [
        { type: "covered_by", to: "TEST-MANIFEST-CLS" },
        { type: "implements", to: "REQ-MANIFEST-CLS" },
      ],
    });
    expect(symbols[2]).toMatchObject({
      name: "diskOnlyVar",
      reqLinks: [],
    });
    expect(symbols[2]?.id).toHaveLength(16);
    expect(symbols[2]?.id).not.toBe("SYM-DISK-VAR");
  });

  it("qualifies duplicate class method symbols and keeps method directives off the class", async () => {
    const { extractSymbolsFromStagedFile } =
      await loadSymbolExtractModule("qualified-methods");

    const symbols = extractSymbolsFromStagedFile(
      makeStagedFile(
        "src/workers.ts",
        [
          "export class Alpha {",
          "  // implements: REQ-ALPHA-RUN",
          "  run() { return 'alpha'; }",
          "}",
          "export class Beta {",
          "  // implements: REQ-BETA-RUN",
          "  run() { return 'beta'; }",
          "}",
        ].join("\n"),
        "A",
      ),
    );

    expect(symbols.map((symbol: { name: string }) => symbol.name)).toEqual([
      "Alpha",
      "Alpha.run",
      "Beta",
      "Beta.run",
    ]);
    expect(symbols[0]).toMatchObject({ name: "Alpha", reqLinks: [] });
    expect(symbols[1]).toMatchObject({
      name: "Alpha.run",
      kind: "method",
      reqLinks: ["REQ-ALPHA-RUN"],
    });
    expect(symbols[2]).toMatchObject({ name: "Beta", reqLinks: [] });
    expect(symbols[3]).toMatchObject({
      name: "Beta.run",
      kind: "method",
      reqLinks: ["REQ-BETA-RUN"],
    });
    expect(symbols[1]?.id).not.toBe(symbols[3]?.id);
  });
});

describe("symbol-extract (cache and failure branches)", () => {
  it("reuses cache until TTL expires and preserves manifest lookup precedence", async () => {
    const originalDateNow = Date.now;
    const originalCreateSourceFile = Project.prototype.createSourceFile;
    let now = 1_000;
    Date.now = () => now;

    const createSourceFileCalls: Array<{ path: string; scriptKind: string }> =
      [];

    const goodFunction = {
      isExported: () => true,
      getName: () => "lookupFn",
      getNameNode: () => ({ getStart: () => 1 }),
      getStart: () => 1,
      getEnd: () => 3,
      getFullText: () => "export function lookupFn() {}",
      getJsDocs: () => [],
    };

    const sourceFile = {
      getFunctions: () => [goodFunction],
      getClasses: () => [],
      getEnums: () => [],
      getVariableStatements: () => [],
      getLineAndColumnAtPos: (pos: number) => ({ line: pos, column: 1 }),
    };

    Project.prototype.createSourceFile = (
      path: string,
      _content: string,
      options?: unknown,
    ) => {
      createSourceFileCalls.push({
        path,
        scriptKind: String(
          (options as { scriptKind?: unknown } | undefined)?.scriptKind,
        ),
      });
      return sourceFile as never;
    };

    const { extractSymbolsFromStagedFile } =
      await loadSymbolExtractModule("cache-ttl");
    const staged = {
      path: "src/cache.ts",
      content: "export function lookupFn() {}",
      hunkRanges: [{ start: 1, end: 10 }],
      status: "A" as const,
    };
    const manifestLookup = new Map([
      [
        "src/cache.ts:lookupFn",
        {
          id: "SYM-CACHE",
          relationships: [{ type: "implements", to: "REQ-CACHE" }],
        },
      ],
    ]);

    try {
      expect(
        extractSymbolsFromStagedFile(staged, manifestLookup)[0],
      ).toMatchObject({
        id: "SYM-CACHE",
        reqLinks: ["REQ-CACHE"],
      });
      expect(createSourceFileCalls).toHaveLength(1);
      expect(createSourceFileCalls[0]?.scriptKind).not.toBe("undefined");

      now += 10;
      extractSymbolsFromStagedFile(staged, manifestLookup);
      expect(createSourceFileCalls).toHaveLength(1);

      const missedLookup = extractSymbolsFromStagedFile(staged, new Map())[0];
      expect(missedLookup?.id).toHaveLength(16);
      expect(missedLookup?.reqLinks).toEqual([]);

      now += 30_001;
      extractSymbolsFromStagedFile(staged, manifestLookup);
      expect(createSourceFileCalls).toHaveLength(2);
    } finally {
      Date.now = originalDateNow;
      Project.prototype.createSourceFile = originalCreateSourceFile;
    }
  });

  it("returns an empty list when parsing fails and caches null source files", async () => {
    const originalDateNow = Date.now;
    const originalCreateSourceFile = Project.prototype.createSourceFile;
    let now = 5_000;
    Date.now = () => now;

    let createSourceFileCalls = 0;

    Project.prototype.createSourceFile = () => {
      createSourceFileCalls += 1;
      throw new Error("boom");
    };

    const { extractSymbolsFromStagedFile } =
      await loadSymbolExtractModule("null-cache");
    const staged = makeStagedFile("broken.ts", "export function broken(", "M");

    try {
      expect(extractSymbolsFromStagedFile(staged)).toEqual([]);
      expect(extractSymbolsFromStagedFile(staged)).toEqual([]);
      expect(createSourceFileCalls).toBe(1);

      now += 30_001;
      expect(extractSymbolsFromStagedFile(staged)).toEqual([]);
      expect(createSourceFileCalls).toBe(2);
    } finally {
      Date.now = originalDateNow;
      Project.prototype.createSourceFile = originalCreateSourceFile;
    }
  });

  it("skips malformed declarations, filters hunks, and falls back through manifest and hash branches", async () => {
    const originalCreateSourceFile = Project.prototype.createSourceFile;
    const manifestDir = makeTempDir("symbol-extract-mock-manifest-");
    const srcDir = join(manifestDir, "src");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(
      join(srcDir, "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-CLASS",
        "    title: ManifestClass",
        "    links:",
        "      - REQ-FROM-MANIFEST",
        "      - not valid",
        "      - type: relates_to",
        "        target: REQ-IGNORED",
        "  - id: SYM-ENUM",
        "    title: ManifestEnum",
        "    links:",
        "      - REQ-ENUM",
        "  - id: SYM-VAR",
        "    title: ManifestVar",
        "    links:",
        "      - REQ-VAR",
      ].join("\n"),
    );

    const functionNode = {
      isExported: () => true,
      getName: () => "fnWithInlineReq",
      getNameNode: () => ({ getStart: () => 1 }),
      getStart: () => 1,
      getEnd: () => 4,
      getFullText: () =>
        "// implements: REQ-INLINE\nexport function fnWithInlineReq() {}",
      getJsDocs: () => [{ getFullText: () => "/** ignored */" }],
    };
    const brokenFunction = {
      isExported: () => true,
      getName: () => {
        throw new Error("bad function");
      },
    };
    const hiddenFunction = { isExported: () => false };

    const classNode = {
      isExported: () => true,
      getName: () => "ManifestClass",
      getNameNode: () => ({ getStart: () => 5 }),
      getStart: () => 5,
      getEnd: () => 8,
      getText: () => "export class ManifestClass {}",
      getJsDocs: () => [{ getFullText: () => "/** docs */" }],
    };
    const brokenClass = {
      isExported: () => true,
      getName: () => "BrokenClass",
      getNameNode: () => ({
        getStart: () => {
          throw new Error("bad class");
        },
      }),
      getStart: () => 9,
      getEnd: () => 10,
      getText: () => "export class BrokenClass {}",
      getJsDocs: () => [],
    };
    const hiddenClass = { isExported: () => false };

    const enumNode = {
      isExported: () => true,
      getName: () => "ManifestEnum",
      getNameNode: () => ({ getStart: () => 9 }),
      getStart: () => 9,
      getEnd: () => 12,
      getText: () => "export enum ManifestEnum { On }",
    };
    const brokenEnum = {
      isExported: () => true,
      getName: () => "BrokenEnum",
      getNameNode: () => ({
        getStart: () => {
          throw new Error("bad enum");
        },
      }),
      getStart: () => 12,
      getEnd: () => 13,
      getText: () => "export enum BrokenEnum { Off }",
    };
    const hiddenEnum = { isExported: () => false };

    const goodDeclaration = {
      getName: () => "ManifestVar",
      getNameNode: () => ({ getStart: () => 13 }),
      getStart: () => 13,
      getEnd: () => 14,
      getText: () => "ManifestVar = 1",
    };
    const brokenDeclaration = {
      getName: () => {
        throw new Error("bad var");
      },
    };
    const hashDeclaration = {
      getName: () => "HashOnlyVar",
      getNameNode: () => ({ getStart: () => 16 }),
      getStart: () => 16,
      getEnd: () => 17,
      getText: () => "HashOnlyVar = 2",
    };
    const exportedVariableStatement = {
      isExported: () => true,
      getDeclarations: () => [
        goodDeclaration,
        brokenDeclaration,
        hashDeclaration,
      ],
    };
    const hiddenVariableStatement = {
      isExported: () => false,
      getDeclarations: () => [],
    };

    const sourceFile = {
      getFunctions: () => [functionNode, brokenFunction, hiddenFunction],
      getClasses: () => [classNode, brokenClass, hiddenClass],
      getInterfaces: () => [],
      getTypeAliases: () => [],
      getEnums: () => [enumNode, brokenEnum, hiddenEnum],
      getVariableStatements: () => [
        exportedVariableStatement,
        hiddenVariableStatement,
      ],
      getLineAndColumnAtPos: (pos: number) => ({ line: pos, column: 1 }),
    };

    Project.prototype.createSourceFile = () => sourceFile as never;

    const { extractSymbolsFromStagedFile } =
      await loadSymbolExtractModule("mocked-branches");

    try {
      const modified = extractSymbolsFromStagedFile({
        path: join(srcDir, "feature.ts"),
        content: "irrelevant",
        hunkRanges: [{ start: 1, end: 14 }],
        status: "M",
      });

      expect(modified).toHaveLength(4);
      expect(modified.map((symbol: { name: string }) => symbol.name)).toEqual([
        "fnWithInlineReq",
        "ManifestClass",
        "ManifestEnum",
        "ManifestVar",
      ]);
      expect(modified[0]).toMatchObject({
        reqLinks: ["REQ-INLINE"],
        kind: "function",
      });
      expect(modified[1]).toMatchObject({
        id: "SYM-CLASS",
        reqLinks: ["REQ-FROM-MANIFEST"],
      });
      expect(modified[2]).toMatchObject({
        id: "SYM-ENUM",
        reqLinks: ["REQ-ENUM"],
      });
      expect(modified[3]).toMatchObject({
        id: "SYM-VAR",
        reqLinks: ["REQ-VAR"],
      });

      const renamed = extractSymbolsFromStagedFile({
        path: "single-file.ts",
        content: "irrelevant",
        hunkRanges: [],
        status: "R",
      });
      expect(
        renamed.some(
          (symbol: { name: string }) => symbol.name === "HashOnlyVar",
        ),
      ).toBe(true);
      expect(
        renamed.find(
          (symbol: { name: string; id: string }) =>
            symbol.name === "HashOnlyVar",
        )?.id,
      ).toHaveLength(16);
    } finally {
      Project.prototype.createSourceFile = originalCreateSourceFile;
    }
  });
});
