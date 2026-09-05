// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as symbolCoordinates from "../../src/extractors/symbol-coordinates.js";
import {
  refreshSymbolCoordinatesForManifest,
  refreshSymbolCoordinatesUnlocked,
  setSymbolRefreshForTests,
} from "../../src/operations/mutation/symbol-refresh.js";
import * as coordinator from "../../src/public/extractors/symbols-coordinator.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  setSymbolRefreshForTests(undefined);
  for (const restore of restores.splice(0)) restore();
  for (const workspace of workspaces.splice(0)) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
  process.exitCode = 0;
});

function context(workspaceRoot: string): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    fs: nodeFilesystem,
  };
}

function preparedWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "kibi-refresh-remain-"));
  workspaces.push(workspace);
  mkdirSync(join(workspace, ".kb"), { recursive: true });
  mkdirSync(join(workspace, "src"), { recursive: true });
  return workspace;
}

describe("symbol refresh remaining publication and parse branches", () => {
  test("rejects a non-mapping manifest root", async () => {
    const workspace = preparedWorkspace();
    writeFileSync(join(workspace, ".kb", "symbols.yaml"), "[]\n");
    await expect(
      refreshSymbolCoordinatesUnlocked("SYM-1", context(workspace)),
    ).rejects.toThrow(/could not be parsed: manifest root is not a mapping/);
  });

  test("returns found without refresh when a missing source has no extractable span", async () => {
    const workspace = preparedWorkspace();
    writeFileSync(
      join(workspace, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-MISS\n    title: missingFn\n    sourceFile: src/nope.ts\n",
    );
    const result = await refreshSymbolCoordinatesUnlocked(
      "SYM-MISS",
      context(workspace),
    );
    expect(result).toEqual({ refreshed: false, found: true });
  });

  test("leaves coordinates unchanged when enrichment points at unreadable source bytes", async () => {
    const workspace = preparedWorkspace();
    writeFileSync(
      join(workspace, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-GONE\n    title: gone\n    sourceFile: src/gone.ts\n",
    );
    const enrich = spyOn(coordinator, "enrichSymbolCoordinates").mockResolvedValue(
      [
        {
          id: "SYM-GONE",
          title: "gone",
          sourceFile: "src/gone.ts",
          sourceLine: 1,
          sourceColumn: 0,
          sourceEndLine: 1,
          sourceEndColumn: 4,
        },
      ],
    );
    restores.push(() => enrich.mockRestore());
    const result = await refreshSymbolCoordinatesUnlocked(
      "SYM-GONE",
      context(workspace),
    );
    expect(result).toEqual({
      refreshed: false,
      found: true,
      outcome: "unchanged",
    });
  });

  test("rolls back a newly published artifact and refuses rollback after it disappears", async () => {
    const workspace = preparedWorkspace();
    writeFileSync(
      join(workspace, "src", "keep.ts"),
      "export function keep() {}\n",
    );
    writeFileSync(
      join(workspace, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-KEEP\n    title: keep\n    sourceFile: src/keep.ts\n",
    );
    const first = await refreshSymbolCoordinatesUnlocked(
      "SYM-KEEP",
      context(workspace),
    );
    expect(first.outcome).toBe("updated");
    expect(first.publication).toBeDefined();
    first.publication?.rollback();
    expect(existsSync(join(workspace, ".kb", "symbol-coordinates.yaml"))).toBe(
      false,
    );

    const second = await refreshSymbolCoordinatesUnlocked(
      "SYM-KEEP",
      context(workspace),
    );
    expect(second.outcome).toBe("updated");
    unlinkSync(join(workspace, ".kb", "symbol-coordinates.yaml"));
    expect(() => second.publication?.rollback()).toThrow(
      /disappeared before rollback/,
    );
  });

  test("cleans a temp file best-effort when atomic rename fails", async () => {
    const workspace = preparedWorkspace();
    writeFileSync(
      join(workspace, "src", "keep.ts"),
      "export function keep() {}\n",
    );
    writeFileSync(
      join(workspace, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-KEEP\n    title: keep\n    sourceFile: src/keep.ts\n",
    );
    const originalRename = fs.renameSync;
    const originalUnlink = fs.unlinkSync;
    const rename = spyOn(fs, "renameSync").mockImplementation(((
      from: fs.PathLike,
      to: fs.PathLike,
    ) => {
      if (String(from).includes(".kibi-tmp-")) {
        throw new Error("EXDEV rename");
      }
      return originalRename(from, to);
    }) as typeof fs.renameSync);
    const unlink = spyOn(fs, "unlinkSync").mockImplementation(((
      target: fs.PathLike,
    ) => {
      if (String(target).includes(".kibi-tmp-")) {
        throw new Error("ENOENT temp");
      }
      return originalUnlink(target);
    }) as typeof fs.unlinkSync);
    restores.push(() => {
      rename.mockRestore();
      unlink.mockRestore();
    });
    await expect(
      refreshSymbolCoordinatesUnlocked("SYM-KEEP", context(workspace)),
    ).rejects.toThrow(/EXDEV rename/);
  });

  test("refuses to preserve an invalid legacy span while rewriting an artifact", async () => {
    const workspace = preparedWorkspace();
    const manifestPath = join(workspace, ".kb", "symbols.yaml");
    writeFileSync(manifestPath, "symbols: []\n");
    writeFileSync(join(workspace, ".kb", "symbol-coordinates.yaml"), "coordinates: {}\n");
    const parse = spyOn(symbolCoordinates, "parseCoordinateArtifact").mockReturnValue(
      {
        status: "legacy",
        coordinates: {
          "SYM-GONE": {
            sourceFile: "src/gone.ts",
            sourceLine: 1,
            sourceColumn: 0,
            sourceEndLine: 1,
            sourceEndColumn: 4,
          },
          "SYM-BAD": {
            sourceFile: "",
            sourceLine: 0,
            sourceColumn: -1,
            sourceEndLine: 0,
            sourceEndColumn: -1,
          },
        },
      },
    );
    restores.push(() => parse.mockRestore());
    await expect(
      refreshSymbolCoordinatesForManifest(
        "SYM-GONE",
        manifestPath,
        context(workspace),
      ),
    ).rejects.toThrow(/invalid legacy coordinate span for SYM-BAD/);
  });
});
