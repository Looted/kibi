import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as manifestExports from "../../src/extractors/manifest";

const tempRoots: string[] = [];
const symbolCoordinatesModulePath =
  "../../src/extractors/symbol-coordinates.js";

function createWorkspace(): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kibi-symbol-coordinates-"));
  tempRoots.push(workspaceRoot);
  return workspaceRoot;
}

function sourceHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function loadSymbolCoordinatesModule(): Promise<Record<string, unknown>> {
  return import(symbolCoordinatesModulePath).catch(() => {
    return {} as Record<string, unknown>;
  });
}

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});

describe("symbol coordinates artifact", () => {
  test("parses a valid coordinate artifact", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.readCoordinateArtifact).toBe(
      "function",
    );
    if (typeof symbolCoordinatesExports.readCoordinateArtifact !== "function") {
      return;
    }

    const artifact = (
      symbolCoordinatesExports.readCoordinateArtifact as (
        content: string,
      ) => unknown
    )(`version: 2
coordinates:
  SYM-001:
    identityHash: '${"1".repeat(64)}'
    sourceHash: ${"a".repeat(64)}
    sourceFile: src/example.ts
    sourceLine: 10
    sourceColumn: 2
    sourceEndLine: 12
    sourceEndColumn: 4
`);

    expect(artifact).toEqual({
      coordinates: {
        "SYM-001": {
          identityHash: "1".repeat(64),
          sourceHash: "a".repeat(64),
          sourceColumn: 2,
          sourceEndColumn: 4,
          sourceEndLine: 12,
          sourceFile: "src/example.ts",
          sourceLine: 10,
        },
      },
    });
  });

  test("parses empty or unversioned coordinate artifacts as legacy maps", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.readCoordinateArtifact).toBe(
      "function",
    );
    if (typeof symbolCoordinatesExports.readCoordinateArtifact !== "function") {
      return;
    }

    const readCoordinateArtifact =
      symbolCoordinatesExports.readCoordinateArtifact as (
        content: string,
      ) => unknown;

    expect(readCoordinateArtifact("")).toEqual({ coordinates: {} });
    expect(readCoordinateArtifact("meta: true\n")).toEqual({
      coordinates: {},
    });
    expect(
      readCoordinateArtifact(`coordinates:
  SYM-LEGACY:
    sourceFile: src/legacy.ts
    sourceLine: 1
    sourceColumn: 0
    sourceEndLine: 1
    sourceEndColumn: 12
`),
    ).toEqual({
      coordinates: {
        "SYM-LEGACY": {
          sourceFile: "src/legacy.ts",
          sourceLine: 1,
          sourceColumn: 0,
          sourceEndLine: 1,
          sourceEndColumn: 12,
        },
      },
    });
  });

  test("rejects artifacts containing invalid coordinate records", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.readCoordinateArtifact).toBe(
      "function",
    );
    if (typeof symbolCoordinatesExports.readCoordinateArtifact !== "function") {
      return;
    }

    const readCoordinateArtifact =
      symbolCoordinatesExports.readCoordinateArtifact as (
        content: string,
      ) => unknown;

    // A single malformed record invalidates the whole generated artifact so
    // compilation fails closed instead of silently dropping evidence.
    expect(() =>
      readCoordinateArtifact(`version: 2
coordinates:
  SYM-VALID:
    identityHash: '${"1".repeat(64)}'
    sourceHash: ${"a".repeat(64)}
    sourceFile: src/valid.ts
    sourceLine: 1
    sourceColumn: 0
    sourceEndLine: 2
    sourceEndColumn: 3
  SYM-MISSING-LINE:
    sourceFile: src/invalid.ts
    sourceColumn: 0
    sourceEndLine: 2
    sourceEndColumn: 3
`),
    ).toThrow(/SYM-MISSING-LINE/);

    expect(() =>
      readCoordinateArtifact(`version: 2
coordinates:
  SYM-ZERO-LINE:
    identityHash: '${"1".repeat(64)}'
    sourceHash: ${"a".repeat(64)}
    sourceFile: src/zero.ts
    sourceLine: 0
    sourceColumn: 0
    sourceEndLine: 1
    sourceEndColumn: 0
`),
    ).toThrow(/SYM-ZERO-LINE/);

    expect(() =>
      readCoordinateArtifact(`version: 2
coordinates:
  SYM-FRACTIONAL:
    identityHash: '${"1".repeat(64)}'
    sourceHash: ${"a".repeat(64)}
    sourceFile: src/fractional.ts
    sourceLine: 1.5
    sourceColumn: 0
    sourceEndLine: 2
    sourceEndColumn: 3
`),
    ).toThrow(/SYM-FRACTIONAL/);

    expect(() =>
      readCoordinateArtifact(`version: 2
coordinates:
  SYM-REVERSED:
    identityHash: '${"1".repeat(64)}'
    sourceHash: ${"a".repeat(64)}
    sourceFile: src/reversed.ts
    sourceLine: 3
    sourceColumn: 0
    sourceEndLine: 2
    sourceEndColumn: 3
`),
    ).toThrow(/SYM-REVERSED/);

    expect(
      readCoordinateArtifact(`version: 2
coordinates:
  SYM-VALID:
    identityHash: '${"1".repeat(64)}'
    sourceHash: ${"a".repeat(64)}
    sourceFile: src/valid.ts
    sourceLine: 1
    sourceColumn: 0
    sourceEndLine: 2
    sourceEndColumn: 3
`),
    ).toEqual({
      coordinates: {
        "SYM-VALID": {
          identityHash: "1".repeat(64),
          sourceHash: "a".repeat(64),
          sourceColumn: 0,
          sourceEndColumn: 3,
          sourceEndLine: 2,
          sourceFile: "src/valid.ts",
          sourceLine: 1,
        },
      },
    });
  });

  test("rejects version 2 records without both bindings", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();
    const readCoordinateArtifact =
      symbolCoordinatesExports.readCoordinateArtifact as (
        content: string,
      ) => unknown;

    expect(() =>
      readCoordinateArtifact(`version: 2
coordinates:
  SYM-UNBOUND:
    identityHash: ${"a".repeat(64)}
    sourceFile: src/example.ts
    sourceLine: 1
    sourceColumn: 0
    sourceEndLine: 1
    sourceEndColumn: 5
`),
    ).toThrow(/sourceHash|unbound|binding/i);
  });

  test("refuses to serialize a version 2 record without a source hash", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();
    const writeCoordinateArtifact =
      symbolCoordinatesExports.writeCoordinateArtifact as (
        coordinates: Record<string, unknown>,
      ) => string;

    expect(() =>
      writeCoordinateArtifact({
        "SYM-UNBOUND": {
          identityHash: "a".repeat(64),
          sourceFile: "src/example.ts",
          sourceLine: 1,
          sourceColumn: 0,
          sourceEndLine: 1,
          sourceEndColumn: 5,
        },
      }),
    ).toThrow(/sourceHash|binding/i);
  });

  test("serializes coordinate artifacts deterministically", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.writeCoordinateArtifact).toBe(
      "function",
    );
    if (
      typeof symbolCoordinatesExports.writeCoordinateArtifact !== "function"
    ) {
      return;
    }

    const writeCoordinateArtifact =
      symbolCoordinatesExports.writeCoordinateArtifact as (
        coordinates: Record<string, unknown>,
      ) => string;

    const first = writeCoordinateArtifact({
      "SYM-002": {
        identityHash: "2".repeat(64),
        sourceHash: "b".repeat(64),
        sourceFile: "src/beta.ts",
        sourceLine: 20,
        sourceColumn: 2,
        sourceEndLine: 20,
        sourceEndColumn: 8,
      },
      "SYM-001": {
        identityHash: "1".repeat(64),
        sourceHash: "a".repeat(64),
        sourceFile: "src/alpha.ts",
        sourceLine: 10,
        sourceColumn: 0,
        sourceEndLine: 10,
        sourceEndColumn: 5,
      },
    });
    const second = writeCoordinateArtifact({
      "SYM-001": {
        identityHash: "1".repeat(64),
        sourceHash: "a".repeat(64),
        sourceFile: "src/alpha.ts",
        sourceLine: 10,
        sourceColumn: 0,
        sourceEndLine: 10,
        sourceEndColumn: 5,
      },
      "SYM-002": {
        identityHash: "2".repeat(64),
        sourceHash: "b".repeat(64),
        sourceFile: "src/beta.ts",
        sourceLine: 20,
        sourceColumn: 2,
        sourceEndLine: 20,
        sourceEndColumn: 8,
      },
    });

    expect(first).toBe(second);
    expect(first).toBe(`# symbol-coordinates.yaml
# GENERATED coordinate artifact — do not edit manually.
# Run \`kibi sync --refresh-symbol-coordinates\` to refresh.
version: 2
coordinates:
  SYM-001:
    identityHash: '1111111111111111111111111111111111111111111111111111111111111111'
    sourceHash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    sourceColumn: 0
    sourceEndColumn: 5
    sourceEndLine: 10
    sourceFile: src/alpha.ts
    sourceLine: 10
  SYM-002:
    identityHash: '2222222222222222222222222222222222222222222222222222222222222222'
    sourceHash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    sourceColumn: 2
    sourceEndColumn: 8
    sourceEndLine: 20
    sourceFile: src/beta.ts
    sourceLine: 20
`);
  });

  test("merges source-bound coordinate artifacts onto manifest records", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.mergeCoordinatesWithManifest).toBe(
      "function",
    );
    if (
      typeof symbolCoordinatesExports.mergeCoordinatesWithManifest !==
      "function"
    ) {
      return;
    }

    const manifestRecords = [
      {
        id: "SYM-001",
        title: "Example",
        sourceFile: "src/example.ts",
      },
    ];

    const legacyContent = [
      "// filler",
      "// filler",
      "// filler",
      "// filler",
      "// filler",
      "// filler",
      "// filler",
      "// filler",
      "// filler",
      "  Example",
      "",
    ].join("\n");
    const coordinateIdentityHash =
      symbolCoordinatesExports.coordinateIdentityHash as (
        identity: Record<string, unknown>,
      ) => string;
    const merged = (
      symbolCoordinatesExports.mergeCoordinatesWithManifest as (
        symbolRecords: Array<Record<string, unknown>>,
        coordinateArtifact: { coordinates: Record<string, unknown> } | null,
        options?: {
          readonly resolveSourceText?: (sourceFile: string) => string | null;
        },
      ) => Array<Record<string, unknown>>
    )(
      manifestRecords,
      {
        coordinates: {
          "SYM-001": {
            identityHash: coordinateIdentityHash(manifestRecords[0]),
            sourceHash: sourceHash(legacyContent),
            sourceFile: "src/example.ts",
            sourceLine: 10,
            sourceColumn: 2,
            sourceEndLine: 12,
            sourceEndColumn: 4,
          },
        },
      },
      {
        resolveSourceText: () => legacyContent,
      },
    );

    expect(merged).toEqual([
      {
        id: "SYM-001",
        title: "Example",
        sourceFile: "src/example.ts",
        sourceLine: 10,
        sourceColumn: 2,
        sourceEndLine: 12,
        sourceEndColumn: 4,
      },
    ]);
    expect(merged).not.toBe(manifestRecords);
    expect(merged[0]).not.toBe(manifestRecords[0]);

    const unvalidatable = (
      symbolCoordinatesExports.mergeCoordinatesWithManifest as (
        symbolRecords: Array<Record<string, unknown>>,
        coordinateArtifact: { coordinates: Record<string, unknown> } | null,
        options?: {
          readonly resolveSourceText?: (sourceFile: string) => string | null;
        },
      ) => Array<Record<string, unknown>>
    )(
      manifestRecords,
      {
        coordinates: {
          "SYM-001": {
            identityHash: coordinateIdentityHash(manifestRecords[0]),
            sourceHash: sourceHash(legacyContent),
            sourceFile: "src/example.ts",
            sourceLine: 10,
            sourceColumn: 2,
            sourceEndLine: 12,
            sourceEndColumn: 4,
          },
        },
      },
      {
        resolveSourceText: () => null,
      },
    );
    // Without current extraction evidence the stale span fails closed.
    expect(unvalidatable).toEqual([
      { id: "SYM-001", title: "Example", sourceFile: "src/example.ts" },
    ]);
  });

  test("keeps validated inline coordinates when the coordinate artifact is missing", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.mergeCoordinatesWithManifest).toBe(
      "function",
    );
    if (
      typeof symbolCoordinatesExports.mergeCoordinatesWithManifest !==
      "function"
    ) {
      return;
    }

    const manifestRecords = [
      {
        id: "SYM-001",
        title: "Example",
        sourceFile: "src/legacy.ts",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 7,
      },
    ];

    const merge = symbolCoordinatesExports.mergeCoordinatesWithManifest as (
      symbolRecords: Array<Record<string, unknown>>,
      coordinateArtifact: { coordinates: Record<string, unknown> } | null,
      options?: {
        readonly resolveSourceText?: (sourceFile: string) => string | null;
      },
    ) => Array<Record<string, unknown>>;
    const merged = merge(manifestRecords, null, {
      resolveSourceText: () => "Example\n",
    });
    expect(merged).toEqual([
      {
        ...manifestRecords[0],
      },
    ]);
    expect(merged[0]).not.toBe(manifestRecords[0]);

    const stripped = merge(manifestRecords, null, {
      resolveSourceText: () => null,
    });
    expect(stripped).toEqual([
      { id: "SYM-001", title: "Example", sourceFile: "src/legacy.ts" },
    ]);
  });

  test("coexists with bound v2 and validated legacy artifact records", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();
    const merge = symbolCoordinatesExports.mergeCoordinatesWithManifest as (
      symbolRecords: Array<Record<string, unknown>>,
      coordinateArtifact: { coordinates: Record<string, unknown> },
      options: {
        readonly resolveSourceText: (sourceFile: string) => string | null;
      },
    ) => Array<Record<string, unknown>>;
    const coordinateIdentityHash =
      symbolCoordinatesExports.coordinateIdentityHash as (
        identity: Record<string, unknown>,
      ) => string;
    const v2Record = {
      id: "SYM-V2",
      title: "v2Symbol",
      sourceFile: "src/v2.ts",
    };
    const legacyRecord = {
      id: "SYM-LEGACY",
      title: "legacySymbol",
      sourceFile: "src/legacy.ts",
    };

    const merged = merge(
      [v2Record, legacyRecord],
      {
        coordinates: {
          "SYM-V2": {
            identityHash: coordinateIdentityHash(v2Record),
            sourceHash: sourceHash("v2Symbol\n"),
            sourceFile: "src/v2.ts",
            sourceLine: 1,
            sourceColumn: 0,
            sourceEndLine: 1,
            sourceEndColumn: 8,
          },
          "SYM-LEGACY": {
            sourceFile: "src/legacy.ts",
            sourceLine: 1,
            sourceColumn: 0,
            sourceEndLine: 1,
            sourceEndColumn: 12,
          },
        },
      },
      {
        resolveSourceText: (sourceFile) =>
          sourceFile === "src/v2.ts" ? "v2Symbol\n" : "legacySymbol\n",
      },
    );

    expect(merged).toEqual([
      {
        ...v2Record,
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 8,
      },
      {
        ...legacyRecord,
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 12,
      },
    ]);
  });

  test("drops bound v2 coordinates when the live declaration moved", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();
    const merge = symbolCoordinatesExports.mergeCoordinatesWithManifest as (
      symbolRecords: Array<Record<string, unknown>>,
      coordinateArtifact: { coordinates: Record<string, unknown> },
      options: {
        readonly resolveSourceText: (sourceFile: string) => string | null;
      },
    ) => Array<Record<string, unknown>>;
    const coordinateIdentityHash =
      symbolCoordinatesExports.coordinateIdentityHash as (
        identity: Record<string, unknown>,
      ) => string;
    const manifestRecord = {
      id: "SYM-MOVED",
      title: "movedSymbol",
      sourceFile: "src/moved.ts",
    };

    const merged = merge(
      [manifestRecord],
      {
        coordinates: {
          "SYM-MOVED": {
            identityHash: coordinateIdentityHash(manifestRecord),
            sourceHash: sourceHash("movedSymbol\n"),
            sourceFile: "src/moved.ts",
            sourceLine: 1,
            sourceColumn: 0,
            sourceEndLine: 1,
            sourceEndColumn: 11,
          },
        },
      },
      {
        resolveSourceText: () => "// declaration moved\nmovedSymbol\n",
      },
    );

    expect(merged).toEqual([manifestRecord]);
  });

  test("drops bound v2 coordinates when only the declaration body changes", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();
    const merge = symbolCoordinatesExports.mergeCoordinatesWithManifest as (
      symbolRecords: Array<Record<string, unknown>>,
      coordinateArtifact: { coordinates: Record<string, unknown> },
      options: {
        readonly resolveSourceText: (sourceFile: string) => string | null;
      },
    ) => Array<Record<string, unknown>>;
    const coordinateIdentityHash =
      symbolCoordinatesExports.coordinateIdentityHash as (
        identity: Record<string, unknown>,
      ) => string;
    const manifestRecord = {
      id: "SYM-BODY-EDIT",
      title: "stable",
      sourceFile: "src/stable.ts",
    };
    const originalSource = "function stable() {\n  return 1;\n}\n";
    const editedSource =
      "function stable() {\n  if (enabled) {\n    return 1;\n  }\n}\n";

    const merged = merge(
      [manifestRecord],
      {
        coordinates: {
          "SYM-BODY-EDIT": {
            identityHash: coordinateIdentityHash(manifestRecord),
            sourceHash: sourceHash(originalSource),
            sourceFile: "src/stable.ts",
            sourceLine: 1,
            sourceColumn: 9,
            sourceEndLine: 3,
            sourceEndColumn: 10,
          },
        },
      },
      { resolveSourceText: () => editedSource },
    );

    expect(merged).toEqual([manifestRecord]);
  });

  test("accepts bound v2 coordinates for qualified declarations", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();
    const merge = symbolCoordinatesExports.mergeCoordinatesWithManifest as (
      symbolRecords: Array<Record<string, unknown>>,
      coordinateArtifact: { coordinates: Record<string, unknown> },
      options: {
        readonly resolveSourceText: (sourceFile: string) => string | null;
      },
    ) => Array<Record<string, unknown>>;
    const coordinateIdentityHash =
      symbolCoordinatesExports.coordinateIdentityHash as (
        identity: Record<string, unknown>,
      ) => string;
    const manifestRecord = {
      id: "SYM-QUALIFIED",
      title: "ArtifactPath.appendText",
      sourceFile: "src/artifact-path.ts",
    };

    const merged = merge(
      [manifestRecord],
      {
        coordinates: {
          "SYM-QUALIFIED": {
            identityHash: coordinateIdentityHash(manifestRecord),
            sourceHash: sourceHash(
              "class ArtifactPath {\n  async appendText(name: string) {}\n}\n",
            ),
            sourceFile: "src/artifact-path.ts",
            sourceLine: 2,
            sourceColumn: 8,
            sourceEndLine: 3,
            sourceEndColumn: 18,
          },
        },
      },
      {
        resolveSourceText: () =>
          "class ArtifactPath {\n  async appendText(name: string) {}\n}\n",
      },
    );

    expect(merged[0]).toMatchObject({
      ...manifestRecord,
      sourceLine: 2,
      sourceColumn: 8,
    });
  });

  test("prefers coordinate artifacts when inline coordinates conflict", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.mergeCoordinatesWithManifest).toBe(
      "function",
    );
    if (
      typeof symbolCoordinatesExports.mergeCoordinatesWithManifest !==
      "function"
    ) {
      return;
    }

    const manifestRecords = [
      {
        id: "SYM-001",
        title: "Example",
        sourceFile: "src/fresh-artifact.ts",
        sourceLine: 2,
        sourceColumn: 0,
        sourceEndLine: 2,
        sourceEndColumn: 5,
        coordinatesGeneratedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    // The artifact is authoritative once it exists, so the stale inline span
    // and its generated-at marker are stripped even before validation.
    const merged = (
      symbolCoordinatesExports.mergeCoordinatesWithManifest as (
        symbolRecords: Array<Record<string, unknown>>,
        coordinateArtifact: { coordinates: Record<string, unknown> } | null,
      ) => Array<Record<string, unknown>>
    )(manifestRecords, { coordinates: {} });

    expect(merged[0]).toMatchObject({
      sourceFile: "src/fresh-artifact.ts",
    });
    expect(merged[0]).not.toHaveProperty("sourceLine");
    expect(merged[0]).not.toHaveProperty("coordinatesGeneratedAt");

    const withFreshArtifact = (
      symbolCoordinatesExports.mergeCoordinatesWithManifest as (
        symbolRecords: Array<Record<string, unknown>>,
        coordinateArtifact: { coordinates: Record<string, unknown> } | null,
        options?: {
          readonly resolveSourceText?: (sourceFile: string) => string | null;
        },
      ) => Array<Record<string, unknown>>
    )(
      manifestRecords.map((record) => ({ ...record })),
      {
        coordinates: {
          "SYM-001": {
            identityHash: (
              symbolCoordinatesExports.coordinateIdentityHash as (
                identity: Record<string, unknown>,
              ) => string
            )(manifestRecords[0]),
            sourceHash: sourceHash(
              `${Array.from({ length: 19 }, () => "// filler").join("\n")}\n   Example\n`,
            ),
            sourceFile: "src/fresh-artifact.ts",
            sourceLine: 20,
            sourceColumn: 3,
            sourceEndLine: 22,
            sourceEndColumn: 9,
          },
        },
      },
      {
        resolveSourceText: (sourceFile) =>
          sourceFile === "src/fresh-artifact.ts"
            ? `${Array.from({ length: 19 }, () => "// filler").join("\n")}\n   Example\n`
            : null,
      },
    );

    expect(withFreshArtifact[0]).toMatchObject({
      sourceFile: "src/fresh-artifact.ts",
      sourceLine: 20,
      sourceColumn: 3,
      sourceEndLine: 22,
      sourceEndColumn: 9,
    });
    expect(withFreshArtifact[0]).not.toHaveProperty("coordinatesGeneratedAt");
  });

  test("never writes coordinatesGeneratedAt to the coordinate artifact output", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.writeCoordinateArtifact).toBe(
      "function",
    );
    if (
      typeof symbolCoordinatesExports.writeCoordinateArtifact !== "function"
    ) {
      return;
    }

    const output = (
      symbolCoordinatesExports.writeCoordinateArtifact as (
        coordinates: Record<string, unknown>,
      ) => string
    )({
      "SYM-001": {
        identityHash: "a".repeat(64),
        sourceHash: "b".repeat(64),
        sourceFile: "src/example.ts",
        sourceLine: 10,
        sourceColumn: 2,
        sourceEndLine: 12,
        sourceEndColumn: 4,
        coordinatesGeneratedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(output).not.toContain("coordinatesGeneratedAt");
  });

  test("serializes empty coordinate artifacts with the generated header", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.writeCoordinateArtifact).toBe(
      "function",
    );
    if (
      typeof symbolCoordinatesExports.writeCoordinateArtifact !== "function"
    ) {
      return;
    }

    const output = (
      symbolCoordinatesExports.writeCoordinateArtifact as (
        coordinates: Record<string, unknown>,
      ) => string
    )({});

    expect(output).toContain("# symbol-coordinates.yaml");
    expect(output).toContain("coordinates: {}");
  });

  test("returns an empty merge result when manifest records are empty", async () => {
    const symbolCoordinatesExports = await loadSymbolCoordinatesModule();

    expect(typeof symbolCoordinatesExports.mergeCoordinatesWithManifest).toBe(
      "function",
    );
    if (
      typeof symbolCoordinatesExports.mergeCoordinatesWithManifest !==
      "function"
    ) {
      return;
    }

    expect(
      (
        symbolCoordinatesExports.mergeCoordinatesWithManifest as (
          symbolRecords: Array<Record<string, unknown>>,
          coordinateArtifact: { coordinates: Record<string, unknown> } | null,
        ) => Array<Record<string, unknown>>
      )([], { coordinates: {} }),
    ).toEqual([]);
  });
});

describe("manifest coordinate overlay reader", () => {
  test("reads a manifest with coordinate overlay when split files exist", () => {
    const readManifestWithCoordinateOverlay = (
      manifestExports as Record<string, unknown>
    ).readManifestWithCoordinateOverlay;

    expect(typeof readManifestWithCoordinateOverlay).toBe("function");
    if (typeof readManifestWithCoordinateOverlay !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const documentationDir = join(workspaceRoot, "documentation");
    mkdirSync(join(workspaceRoot, "src"), { recursive: true });
    mkdirSync(documentationDir, { recursive: true });
    writeFileSync(
      join(workspaceRoot, "src", "fresh.ts"),
      `${Array.from({ length: 9 }, () => "// filler").join("\n")}\n  Example\n`,
      "utf8",
    );

    const symbolsPath = join(documentationDir, "symbols.yaml");
    writeFileSync(
      symbolsPath,
      `symbols:
  - id: SYM-001
    title: Example
    sourceFile: src/fresh.ts
    sourceLine: 1
    sourceColumn: 0
    sourceEndLine: 1
    sourceEndColumn: 5
`,
      "utf8",
    );
    writeFileSync(
      join(documentationDir, "symbol-coordinates.yaml"),
      `version: 2
coordinates:
  SYM-001:
    identityHash: ${sourceHash("SYM-001\u0000Example\u0000src/fresh.ts\u0000")}
    sourceHash: ${sourceHash(`${Array.from({ length: 9 }, () => "// filler").join("\n")}\n  Example\n`)}
    sourceFile: src/fresh.ts
    sourceLine: 10
    sourceColumn: 2
    sourceEndLine: 12
    sourceEndColumn: 4
`,
      "utf8",
    );

    const records = (
      readManifestWithCoordinateOverlay as (
        manifestPath: string,
        coordinatesPath?: string,
      ) => Array<Record<string, unknown>>
    )(symbolsPath);

    expect(records).toEqual([
      {
        id: "SYM-001",
        title: "Example",
        sourceFile: "src/fresh.ts",
        sourceLine: 10,
        sourceColumn: 2,
        sourceEndLine: 12,
        sourceEndColumn: 4,
      },
    ]);
  });

  test("keeps live-validated inline coordinates when the coordinate artifact is missing", () => {
    const readManifestWithCoordinateOverlay = (
      manifestExports as Record<string, unknown>
    ).readManifestWithCoordinateOverlay;

    expect(typeof readManifestWithCoordinateOverlay).toBe("function");
    if (typeof readManifestWithCoordinateOverlay !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const documentationDir = join(workspaceRoot, "documentation");
    mkdirSync(join(workspaceRoot, "src"), { recursive: true });
    mkdirSync(documentationDir, { recursive: true });
    writeFileSync(join(workspaceRoot, "src", "inline.ts"), "Example\n", "utf8");

    const symbolsPath = join(documentationDir, "symbols.yaml");
    writeFileSync(
      symbolsPath,
      `symbols:
  - id: SYM-001
    title: Example
    sourceFile: src/inline.ts
    sourceLine: 1
    sourceColumn: 0
    sourceEndLine: 1
    sourceEndColumn: 5
`,
      "utf8",
    );

    const records = (
      readManifestWithCoordinateOverlay as (
        manifestPath: string,
        coordinatesPath?: string,
      ) => Array<Record<string, unknown>>
    )(symbolsPath);

    expect(records).toEqual([
      {
        id: "SYM-001",
        title: "Example",
        sourceFile: "src/inline.ts",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 5,
      },
    ]);
  });

  test("uses an explicit coordinate artifact path when provided", () => {
    const readManifestWithCoordinateOverlay = (
      manifestExports as Record<string, unknown>
    ).readManifestWithCoordinateOverlay;

    expect(typeof readManifestWithCoordinateOverlay).toBe("function");
    if (typeof readManifestWithCoordinateOverlay !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const documentationDir = join(workspaceRoot, "documentation");
    mkdirSync(join(workspaceRoot, "src"), { recursive: true });
    mkdirSync(documentationDir, { recursive: true });
    writeFileSync(
      join(workspaceRoot, "src", "custom.ts"),
      `${Array.from({ length: 6 }, () => "// filler").join("\n")}\n Example\n`,
      "utf8",
    );

    const symbolsPath = join(documentationDir, "symbols.yaml");
    const coordinatesPath = join(workspaceRoot, "custom-coordinates.yaml");
    writeFileSync(
      symbolsPath,
      `symbols:
  - id: SYM-001
    title: Example
    sourceFile: src/custom.ts
`,
      "utf8",
    );
    writeFileSync(
      coordinatesPath,
      `version: 2
coordinates:
  SYM-001:
    identityHash: ${sourceHash("SYM-001\u0000Example\u0000src/custom.ts\u0000")}
    sourceHash: ${sourceHash(`${Array.from({ length: 6 }, () => "// filler").join("\n")}\n Example\n`)}
    sourceFile: src/custom.ts
    sourceLine: 7
    sourceColumn: 1
    sourceEndLine: 8
    sourceEndColumn: 2
`,
      "utf8",
    );

    const records = (
      readManifestWithCoordinateOverlay as (
        manifestPath: string,
        coordinatesPath?: string,
      ) => Array<Record<string, unknown>>
    )(symbolsPath, coordinatesPath);

    expect(records[0]).toMatchObject({
      sourceFile: "src/custom.ts",
      sourceLine: 7,
      sourceColumn: 1,
      sourceEndLine: 8,
      sourceEndColumn: 2,
    });
  });
});
