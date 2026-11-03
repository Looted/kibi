// implements REQ-vscode-traceability
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as runtime from "kibi-runtime";

import {
  handleKbSymbolsRefresh,
  readCoordinateArtifact,
  refreshCoordinatesForSymbolId,
  writeCoordinateArtifact,
  writeLegacyCoordinateArtifact,
} from "../../src/tools/symbols.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const HASH = "a".repeat(64);

function workspace(source: string, manifest: string): string {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "kibi-mcp-symbols-refresh-")),
  );
  roots.push(root);
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(path.join(root, "src", "a.ts"), source);
  writeFileSync(path.join(root, ".kb", "symbols.yaml"), manifest);
  return root;
}

const coordsFile = (root: string) =>
  path.join(root, ".kb", "symbol-coordinates.yaml");

/** Hands the entries back, recording what the refresh asked for. */
function passThrough(
  transform: (entry: Record<string, unknown>) => Record<string, unknown> = (
    entry,
  ) => entry,
) {
  const calls: unknown[][] = [];
  spies.push(
    spyOn(runtime, "enrichSymbolCoordinates").mockImplementation((async (
      ...args: unknown[]
    ) => {
      calls.push(args);
      return (args[0] as Record<string, unknown>[]).map(transform);
    }) as never),
  );
  return calls;
}

const MOVED = {
  sourceLine: 2,
  sourceColumn: 6,
  sourceEndLine: 2,
  sourceEndColumn: 9,
};
const MANIFEST_WITH_SPAN =
  "symbols:\n  - id: S\n    title: foo\n    sourceFile: src/a.ts\n    sourceLine: 1\n    sourceColumn: 6\n    sourceEndLine: 1\n    sourceEndColumn: 9\n";

describe("refresh requests", () => {
  test("entries are enriched with text ids and titles and decorator spans", async () => {
    const root = workspace(
      "const foo = 1;\n",
      "symbols:\n  - sourceFile: src/a.ts\n  - id: 5\n    title: 7\n  - x\n",
    );
    const calls = passThrough();
    await handleKbSymbolsRefresh({ workspaceRoot: root, dryRun: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toStrictEqual([
      { sourceFile: "src/a.ts", id: "", title: "" },
      { id: "", title: "" },
      { id: "", title: "" },
    ]);
    expect(calls[0]?.[1]).toBe(root);
    expect(calls[0]?.[2]).toStrictEqual({
      allowPythonDecoratorCoordinates: true,
    });
  });

  test("a single-symbol refresh asks the same way", async () => {
    const root = workspace(
      "const foo = 1;\n",
      "symbols:\n  - id: S\n    title: 7\n",
    );
    const calls = passThrough();
    await refreshCoordinatesForSymbolId("S", root);
    expect(calls[0]?.[0]).toStrictEqual([{ id: "S", title: "" }]);
    expect(calls[0]?.[2]).toStrictEqual({
      allowPythonDecoratorCoordinates: true,
    });
  });
});

describe("refresh counts", () => {
  test("a span that moved on one axis counts as refreshed", async () => {
    const source = "const foo = 1;\nconst foo = 2;\n";
    const root = workspace(source, MANIFEST_WITH_SPAN);
    passThrough((entry) => ({ ...entry, ...MOVED }));
    const result = await handleKbSymbolsRefresh({
      workspaceRoot: root,
      dryRun: true,
    });
    expect(result.structuredContent).toStrictEqual({
      refreshed: 1,
      failed: 0,
      unchanged: 0,
      dryRun: true,
    });
    expect(await refreshCoordinatesForSymbolId("S", root)).toStrictEqual({
      refreshed: true,
      found: true,
    });
    const written = readCoordinateArtifact(
      readFileSync(coordsFile(root), "utf8"),
    );
    expect(written.coordinates.S).toMatchObject(MOVED);
  });

  test("an unchanged artifact is not published again", async () => {
    const root = workspace(
      "const foo = 1;\n",
      "symbols:\n  - id: S\n    title: foo\n    sourceFile: src/a.ts\n",
    );
    await handleKbSymbolsRefresh({ workspaceRoot: root });
    const first = statSync(coordsFile(root)).ino;
    await handleKbSymbolsRefresh({ workspaceRoot: root });
    expect(statSync(coordsFile(root)).ino).toBe(first);
    await refreshCoordinatesForSymbolId("S", root);
    expect(statSync(coordsFile(root)).ino).toBe(first);
  });
});

describe("single-symbol artifact updates", () => {
  test("a version 2 artifact keeps unrelated records and binds the symbol", async () => {
    const root = workspace(
      "const foo = 1;\n",
      "symbols:\n  - id: S\n    title: foo\n    sourceFile: src/a.ts\n",
    );
    const other = {
      sourceFile: "src/other.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 1,
      sourceEndColumn: 1,
      identityHash: HASH,
      sourceHash: HASH,
    };
    writeFileSync(coordsFile(root), writeCoordinateArtifact({ OTHER: other }));
    await refreshCoordinatesForSymbolId("S", root);
    const written = readCoordinateArtifact(
      readFileSync(coordsFile(root), "utf8"),
    );
    expect(written.status).toBe("parsed");
    expect(Object.keys(written.coordinates)).toStrictEqual(["OTHER", "S"]);
    expect(written.coordinates.OTHER).toStrictEqual(other);
    expect(written.coordinates.S).toMatchObject({
      sourceFile: "src/a.ts",
      sourceLine: 1,
      sourceColumn: 6,
    });
  });

  test("a symbol that no longer resolves is removed from the artifact", async () => {
    for (const legacy of [false, true]) {
      const root = workspace(
        "const bar = 1;\n",
        "symbols:\n  - id: S\n    title: foo\n    sourceFile: src/a.ts\n",
      );
      const record = {
        sourceFile: "src/a.ts",
        sourceLine: 1,
        sourceColumn: 6,
        sourceEndLine: 1,
        sourceEndColumn: 9,
      };
      writeFileSync(
        coordsFile(root),
        legacy
          ? writeLegacyCoordinateArtifact({ S: record })
          : writeCoordinateArtifact({
              S: { ...record, identityHash: HASH, sourceHash: HASH },
            }),
      );
      await refreshCoordinatesForSymbolId("S", root);
      expect(
        readCoordinateArtifact(readFileSync(coordsFile(root), "utf8"))
          .coordinates,
      ).toStrictEqual({});
    }
  });

  test("nothing to record creates no artifact", async () => {
    const root = workspace(
      "const bar = 1;\n",
      "symbols:\n  - id: S\n    title: foo\n    sourceFile: src/missing.ts\n    granularity_reason: test-suite\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1\n",
    );
    passThrough();
    expect(await refreshCoordinatesForSymbolId("S", root)).toStrictEqual({
      refreshed: false,
      found: true,
    });
    expect(existsSync(coordsFile(root))).toBe(false);
  });
});
