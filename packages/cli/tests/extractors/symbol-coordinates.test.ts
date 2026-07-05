import { afterEach, describe, expect, test } from "bun:test";
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
    )(`coordinates:
  SYM-001:
    sourceFile: src/example.ts
    sourceLine: 10
    sourceColumn: 2
    sourceEndLine: 12
    sourceEndColumn: 4
`);

    expect(artifact).toEqual({
      coordinates: {
        "SYM-001": {
          sourceColumn: 2,
          sourceEndColumn: 4,
          sourceEndLine: 12,
          sourceFile: "src/example.ts",
          sourceLine: 10,
        },
      },
    });
  });

  test("parses empty or missing coordinate artifacts as empty maps", async () => {
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
    expect(readCoordinateArtifact("meta: true\n")).toEqual({ coordinates: {} });
  });

  test("skips invalid coordinate records while preserving valid entries", async () => {
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

    expect(
      readCoordinateArtifact(`coordinates:
  SYM-VALID:
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
  SYM-ARRAY:
    - not
    - a
    - record
`),
    ).toEqual({
      coordinates: {
        "SYM-VALID": {
          sourceColumn: 0,
          sourceEndColumn: 3,
          sourceEndLine: 2,
          sourceFile: "src/valid.ts",
          sourceLine: 1,
        },
      },
    });
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
        sourceFile: "src/beta.ts",
        sourceLine: 20,
        sourceColumn: 2,
        sourceEndLine: 20,
        sourceEndColumn: 8,
      },
      "SYM-001": {
        sourceFile: "src/alpha.ts",
        sourceLine: 10,
        sourceColumn: 0,
        sourceEndLine: 10,
        sourceEndColumn: 5,
      },
    });
    const second = writeCoordinateArtifact({
      "SYM-001": {
        sourceFile: "src/alpha.ts",
        sourceLine: 10,
        sourceColumn: 0,
        sourceEndLine: 10,
        sourceEndColumn: 5,
      },
      "SYM-002": {
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
coordinates:
  SYM-001:
    sourceColumn: 0
    sourceEndColumn: 5
    sourceEndLine: 10
    sourceFile: src/alpha.ts
    sourceLine: 10
  SYM-002:
    sourceColumn: 2
    sourceEndColumn: 8
    sourceEndLine: 20
    sourceFile: src/beta.ts
    sourceLine: 20
`);
  });

  test("merges coordinate artifacts onto manifest records", async () => {
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
      },
    ];

    const merged = (
      symbolCoordinatesExports.mergeCoordinatesWithManifest as (
        symbolRecords: Array<Record<string, unknown>>,
        coordinateArtifact: { coordinates: Record<string, unknown> } | null,
      ) => Array<Record<string, unknown>>
    )(manifestRecords, {
      coordinates: {
        "SYM-001": {
          sourceFile: "src/example.ts",
          sourceLine: 10,
          sourceColumn: 2,
          sourceEndLine: 12,
          sourceEndColumn: 4,
        },
      },
    });

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
  });

  test("falls back to legacy inline coordinates when coordinate artifact is missing", async () => {
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

    const merged = (
      symbolCoordinatesExports.mergeCoordinatesWithManifest as (
        symbolRecords: Array<Record<string, unknown>>,
        coordinateArtifact: { coordinates: Record<string, unknown> } | null,
      ) => Array<Record<string, unknown>>
    )(manifestRecords, null);

    expect(merged).toEqual(manifestRecords);
    expect(merged[0]).not.toBe(manifestRecords[0]);
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
        sourceFile: "src/stale-inline.ts",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 1,
        sourceEndColumn: 5,
        coordinatesGeneratedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const merged = (
      symbolCoordinatesExports.mergeCoordinatesWithManifest as (
        symbolRecords: Array<Record<string, unknown>>,
        coordinateArtifact: { coordinates: Record<string, unknown> } | null,
      ) => Array<Record<string, unknown>>
    )(manifestRecords, {
      coordinates: {
        "SYM-001": {
          sourceFile: "src/fresh-artifact.ts",
          sourceLine: 20,
          sourceColumn: 3,
          sourceEndLine: 22,
          sourceEndColumn: 9,
        },
      },
    });

    expect(merged[0]).toMatchObject({
      sourceFile: "src/fresh-artifact.ts",
      sourceLine: 20,
      sourceColumn: 3,
      sourceEndLine: 22,
      sourceEndColumn: 9,
    });
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
    mkdirSync(documentationDir, { recursive: true });

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
    writeFileSync(
      join(documentationDir, "symbol-coordinates.yaml"),
      `coordinates:
  SYM-001:
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

  test("falls back to inline coordinates when the coordinate artifact is missing", () => {
    const readManifestWithCoordinateOverlay = (
      manifestExports as Record<string, unknown>
    ).readManifestWithCoordinateOverlay;

    expect(typeof readManifestWithCoordinateOverlay).toBe("function");
    if (typeof readManifestWithCoordinateOverlay !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const documentationDir = join(workspaceRoot, "documentation");
    mkdirSync(documentationDir, { recursive: true });

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
    mkdirSync(documentationDir, { recursive: true });

    const symbolsPath = join(documentationDir, "symbols.yaml");
    const coordinatesPath = join(workspaceRoot, "custom-coordinates.yaml");
    writeFileSync(
      symbolsPath,
      `symbols:
  - id: SYM-001
    title: Example
    sourceFile: src/inline.ts
`,
      "utf8",
    );
    writeFileSync(
      coordinatesPath,
      `coordinates:
  SYM-001:
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
