// implements REQ-003
import { afterEach, describe, expect, test } from "bun:test";
import {
  isEligibleForCoordinateRefresh,
  refreshManifestCoordinates,
} from "../../../src/commands/sync/manifest.js";
import type { ManifestSymbolEntry } from "../../../src/extractors/symbols-coordinator.js";
import {
  captureIo,
  isolateKibiEnv,
} from "../../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

function entry(
  overrides: Partial<ManifestSymbolEntry> = {},
): ManifestSymbolEntry {
  return {
    id: "SYM-001",
    title: "myFunction",
    sourceFile: "src/foo.ts",
    ...overrides,
  };
}

describe("refreshManifestCoordinates leftover artifact and rollback branches", () => {
  test("rejects an invalid existing coordinate artifact", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    await expect(
      refreshManifestCoordinates("/workspace/.kb/symbols.yaml", "/workspace", {
        readFileSync: ((target: unknown) =>
          String(target).includes("symbol-coordinates")
            ? "not: valid: yaml: ["
            : "symbols: []\n") as never,
        parseYAML: () => ({ symbols: [entry()] }),
        existsSync: () => true,
        enrichSymbolCoordinates: async (rows) => rows,
        resolveSymbolsManifestPaths: () => ({
          coordinatesPath: "/workspace/.kb/symbol-coordinates.yaml",
        }),
        refreshSymbolCoordinates: true,
      }),
    ).rejects.toThrow(/Failed to parse coordinate artifact/);
  });

  test("skips artifact rows without ids or readable source text", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const io = captureIo();
    restores.push(io.restore);
    let published: string | undefined;
    await refreshManifestCoordinates("/workspace/.kb/symbols.yaml", "/workspace", {
      readFileSync: ((target: unknown) => {
        if (String(target).includes("symbols.yaml")) return "original";
        throw new Error("source unreadable");
      }) as never,
      parseYAML: () => ({
        symbols: [
          { title: "no-id" },
          entry({ id: 12 as never, title: 9 as never, sourceFile: 3 as never }),
          entry({
            id: "SYM-COARSE",
            granularity_reason: "test-suite",
            sourceFile: "src/suite.ts",
          }),
        ],
      }),
      existsSync: (target) => !String(target).includes("symbol-coordinates"),
      enrichSymbolCoordinates: async (rows) => rows,
      dumpYAML: () => "dumped\n",
      writeFileSync: () => undefined,
      renameSync: () => undefined,
      writeCoordinateArtifact: (coords) => {
        published = JSON.stringify(coords);
        return "artifact\n";
      },
      resolveSymbolsManifestPaths: () => ({
        coordinatesPath: "/workspace/.kb/symbol-coordinates.yaml",
      }),
      refreshSymbolCoordinates: true,
    });
    expect(published).toBe("{}");
  });

  test("refuses rollback when the published manifest changed underfoot", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    let reads = 0;
    await expect(
      refreshManifestCoordinates("/workspace/.kb/symbols.yaml", "/workspace", {
        readFileSync: ((target: unknown) => {
          if (String(target).includes("symbols.yaml")) {
            reads += 1;
            return reads === 1 ? "original" : "changed-after-publish";
          }
          if (String(target).includes("symbol-coordinates")) {
            return "coordinates: {}\n";
          }
          return "function myFunction() {}\n";
        }) as never,
        parseYAML: () => ({ symbols: [entry()] }),
        existsSync: (target: unknown) =>
          !String(target).includes("symbol-coordinates.yaml"),
        enrichSymbolCoordinates: async (rows) =>
          rows.map((row) => ({ ...row, sourceLine: 2 })),
        dumpYAML: () => "next\n",
        writeFileSync: () => undefined,
        renameSync: (_from, to) => {
          if (String(to).includes("symbol-coordinates.yaml")) {
            throw new Error("artifact denied");
          }
        },
        unlinkSync: () => undefined,
        writeCoordinateArtifact: () => "artifact\n",
        resolveSymbolsManifestPaths: () => ({
          coordinatesPath: "/workspace/.kb/symbol-coordinates.yaml",
        }),
        refreshSymbolCoordinates: true,
      }),
    ).rejects.toBeInstanceOf(AggregateError);
  });

  test("wraps a rollback unlink failure after a failed atomic publish", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    await expect(
      refreshManifestCoordinates("/workspace/.kb/symbols.yaml", "/workspace", {
        readFileSync: () => "original",
        parseYAML: () => ({ symbols: [entry()] }),
        existsSync: () => true,
        enrichSymbolCoordinates: async (rows) => rows,
        dumpYAML: () => "next\n",
        writeFileSync: () => {
          throw new Error("temp write failed");
        },
        unlinkSync: () => {
          throw new Error("unlink failed");
        },
        renameSync: () => undefined,
      }),
    ).rejects.toThrow(/temp write failed/);
  });

  test("treats non-string readFileSync output as missing source text", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(
      isEligibleForCoordinateRefresh("src/foo.ts", "/workspace", {
        existsSync: () => true,
        readFileSync: () => Buffer.from("not-a-string") as never,
      }),
    ).toBe(true);
  });
});
