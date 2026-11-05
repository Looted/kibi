import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  coarseCoordinateSpan,
  coordinateIdentityHash,
  coordinateSourceHash,
  parseCoordinateArtifact,
} from "../../../src/extractors/symbol-coordinates.js";
import {
  type RefreshResult,
  refreshSymbolCoordinates,
  refreshSymbolCoordinatesForManifest,
  refreshSymbolCoordinatesUnlocked,
  restoreOrUnlinkCoordinateArtifact,
  setSymbolRefreshForTests,
} from "../../../src/operations/mutation/symbol-refresh.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";

const SOURCE = "export function alpha(): number {\n  return 1;\n}\n";
const ALPHA = {
  sourceFile: "src/a.ts",
  sourceLine: 1,
  sourceColumn: 16,
  sourceEndLine: 3,
  sourceEndColumn: 1,
};

let root = "";
let reads: string[] = [];
beforeEach(() => {
  root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-refresh-")),
  );
  reads = [];
  write("src/a.ts", SOURCE);
});
afterEach(() => {
  setSymbolRefreshForTests(undefined);
  rmSync(root, { recursive: true, force: true });
});

function write(relative: string, content: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

const MANIFEST = () => path.join(root, ".kb", "symbols.yaml");
const ARTIFACT = () => path.join(root, ".kb", "symbol-coordinates.yaml");

function manifest(...entries: Record<string, unknown>[]) {
  const lines = ["symbols:"];
  for (const entry of entries) {
    const [first, ...rest] = Object.entries(entry);
    lines.push(`  - ${first?.[0]}: ${JSON.stringify(first?.[1])}`);
    for (const [key, value] of rest)
      lines.push(`    ${key}: ${JSON.stringify(value)}`);
  }
  write(".kb/symbols.yaml", `${lines.join("\n")}\n`);
}

function context(extra: Partial<OperationContext> = {}): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date(0),
    fs: {
      readFile: async (file: string) => {
        reads.push(path.relative(root, file));
        return readFile(file, "utf8");
      },
      writeFile: async () => {},
      mkdir: async () => {},
      stat: async () => ({ isFile: () => true, isDirectory: () => false }),
    },
    ...extra,
  } as OperationContext;
}

function artifact() {
  return parseCoordinateArtifact(readFileSync(ARTIFACT(), "utf8"));
}

function sha(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function plain(result: RefreshResult) {
  const { publication, ...rest } = result;
  return publication === undefined
    ? rest
    : {
        ...rest,
        publication: {
          path: publication.path,
          beforeHash: publication.beforeHash,
          afterHash: publication.afterHash,
        },
      };
}

const refresh = (id: string, extra: Partial<OperationContext> = {}) =>
  refreshSymbolCoordinatesUnlocked(id, context(extra));

async function errorOf(run: () => Promise<unknown>) {
  try {
    await run();
    return "ok";
  } catch (error) {
    return {
      name: (error as Error).name,
      message: (error as Error).message,
    };
  }
}

describe("the manifest", () => {
  test("needs a filesystem", async () => {
    expect(
      await refreshSymbolCoordinatesUnlocked("SYM-a", {
        ...context(),
        fs: undefined,
      }),
    ).toStrictEqual({ refreshed: false, found: false });
  });

  test("must parse to a mapping with a symbols array", async () => {
    const at = MANIFEST();
    expect(
      ((await errorOf(() => refresh("SYM-a"))) as { message: string }).message,
    ).toStartWith(`symbol manifest ${at} could not be parsed: ENOENT`);
    write(".kb/symbols.yaml", "- a\n");
    expect(await errorOf(() => refresh("SYM-a"))).toStrictEqual({
      name: "Error",
      message: `symbol manifest ${at} could not be parsed: manifest root is not a mapping`,
    });
    write(".kb/symbols.yaml", "a: [\n");
    expect(
      ((await errorOf(() => refresh("SYM-a"))) as { message: string }).message,
    ).toStartWith(`symbol manifest ${at} could not be parsed: `);
    write(".kb/symbols.yaml", "");
    expect(await errorOf(() => refresh("SYM-a"))).toStrictEqual({
      name: "Error",
      message: `symbol manifest ${at} could not be parsed: manifest root is not a mapping`,
    });
    write(".kb/symbols.yaml", "symbols: {}\n");
    expect(await errorOf(() => refresh("SYM-a"))).toStrictEqual({
      name: "Error",
      message: `symbol manifest ${at} has no symbols array`,
    });
    expect(
      await errorOf(() =>
        refresh("SYM-a", {
          fs: {
            ...(context().fs as NonNullable<OperationContext["fs"]>),
            readFile: async () => {
              throw "boom";
            },
          },
        }),
      ),
    ).toStrictEqual({
      name: "Error",
      message: `symbol manifest ${at} could not be parsed: boom`,
    });
  });

  test("reads an explicitly authored manifest", async () => {
    write(
      "docs/other.yaml",
      'symbols:\n  - id: "SYM-a"\n    title: "alpha"\n    sourceFile: "src/a.ts"\n',
    );
    const result = await refreshSymbolCoordinatesForManifest(
      "SYM-a",
      path.join(root, "docs", "other.yaml"),
      context(),
    );
    expect(result.outcome).toBe("updated");
    expect(reads).toStrictEqual(["docs/other.yaml"]);
    expect(existsSync(path.join(root, "docs", "symbol-coordinates.yaml"))).toBe(
      true,
    );
  });
});

describe("placing a symbol", () => {
  test("publishes its coordinates with identity and source hashes", async () => {
    manifest(
      { id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" },
      { id: 7 },
      "text" as never,
    );
    const result = await refresh("SYM-a");
    const content = readFileSync(ARTIFACT(), "utf8");
    expect(plain(result)).toStrictEqual({
      refreshed: true,
      found: true,
      outcome: "updated",
      publication: {
        path: ARTIFACT(),
        beforeHash: null,
        afterHash: sha(content),
      },
    });
    expect(artifact()).toStrictEqual({
      status: "parsed",
      formatVersion: 2,
      coordinates: {
        "SYM-a": {
          ...ALPHA,
          identityHash: coordinateIdentityHash({
            id: "SYM-a",
            title: "alpha",
            sourceFile: "src/a.ts",
          }),
          sourceHash: coordinateSourceHash(SOURCE),
        },
      },
    } as never);
    expect(reads).toStrictEqual([".kb/symbols.yaml"]);
    expect(readdirSync(path.join(root, ".kb")).sort()).toStrictEqual([
      "symbol-coordinates.yaml",
      "symbols.yaml",
    ]);
  });

  test("leaves an unchanged binding alone", async () => {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    await refresh("SYM-a");
    reads = [];
    expect(await refresh("SYM-a")).toStrictEqual({
      refreshed: false,
      found: true,
      outcome: "unchanged",
    });
    expect(reads).toStrictEqual([
      ".kb/symbols.yaml",
      ".kb/symbol-coordinates.yaml",
    ]);
  });

  test("rebinds the same span when the source bytes or identity change", async () => {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    await refresh("SYM-a");
    write("src/a.ts", `${SOURCE}// note\n`);
    expect((await refresh("SYM-a")).outcome).toBe("updated");
    expect(
      (artifact() as { coordinates: Record<string, { sourceHash: string }> })
        .coordinates["SYM-a"]?.sourceHash,
    ).toBe(coordinateSourceHash(`${SOURCE}// note\n`));
    manifest({
      id: "SYM-a",
      title: "alpha",
      sourceFile: "src/a.ts",
      granularity_reason: "legacy-link",
    });
    expect((await refresh("SYM-a")).outcome).toBe("updated");
    expect(
      (artifact() as { coordinates: Record<string, { identityHash: string }> })
        .coordinates["SYM-a"]?.identityHash,
    ).toBe(
      coordinateIdentityHash({
        id: "SYM-a",
        title: "alpha",
        sourceFile: "src/a.ts",
        granularity_reason: "legacy-link",
      }),
    );
  });

  test("moves a changed span", async () => {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    await refresh("SYM-a");
    for (const source of [
      `\n${SOURCE}`,
      ` ${SOURCE}`,
      SOURCE.replace("  return 1;\n", "  return 1;\n  //\n"),
      SOURCE.replace("\n}", "\n }"),
    ]) {
      write("src/a.ts", source);
      expect(plain(await refresh("SYM-a")).outcome).toBe("updated");
    }
    write("src/b.ts", SOURCE);
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/b.ts" });
    expect(plain(await refresh("SYM-a")).outcome).toBe("updated");
  });

  test("keeps other records and orders them by id", async () => {
    manifest(
      { id: "SYM-b", title: "alpha", sourceFile: "src/a.ts" },
      { id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" },
    );
    await refresh("SYM-b");
    await refresh("SYM-a");
    const content = readFileSync(ARTIFACT(), "utf8");
    expect(content.indexOf("SYM-a:")).toBeLessThan(content.indexOf("SYM-b:"));
  });

  test("skips entries that are not mappings", async () => {
    write(
      ".kb/symbols.yaml",
      'symbols:\n  - null\n  - id: "SYM-a"\n    title: "alpha"\n    sourceFile: "src/a.ts"\n',
    );
    expect((await refresh("SYM-a")).outcome).toBe("updated");
  });

  test("keeps the analyzer's span for a coarse symbol it can place", async () => {
    manifest({
      id: "SYM-a",
      title: "alpha",
      sourceFile: "src/a.ts",
      granularity_reason: "extractor-miss",
    });
    await refresh("SYM-a");
    expect(
      (artifact() as { coordinates: Record<string, unknown> }).coordinates[
        "SYM-a"
      ],
    ).toMatchObject(ALPHA);
  });

  test("a legacy record differing in any span field is rebound", async () => {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    write("src/b.ts", SOURCE);
    for (const [field, value] of [
      ["sourceFile", "src/b.ts"],
      ["sourceLine", 2],
      ["sourceColumn", 15],
      ["sourceEndLine", 4],
      ["sourceEndColumn", 2],
    ] as const) {
      const previous = { ...ALPHA, [field]: value };
      write(
        ".kb/symbol-coordinates.yaml",
        `coordinates:\n  SYM-a:\n${Object.entries(previous)
          .map(([key, v]) => `    ${key}: ${v}`)
          .join("\n")}\n`,
      );
      expect([field, (await refresh("SYM-a")).outcome]).toStrictEqual([
        field,
        "updated",
      ]);
      expect(artifact()).toStrictEqual({
        status: "legacy",
        coordinates: { "SYM-a": ALPHA },
      } as never);
    }
  });

  test("keeps a legacy artifact legacy and judges it by span alone", async () => {
    manifest(
      { id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" },
      { id: "SYM-z", title: "alpha", sourceFile: "src/a.ts" },
    );
    write(
      ".kb/symbol-coordinates.yaml",
      "coordinates:\n  SYM-a:\n    sourceFile: src/a.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 3\n    sourceEndColumn: 1\n",
    );
    expect(await refresh("SYM-a")).toStrictEqual({
      refreshed: false,
      found: true,
      outcome: "unchanged",
    });
    expect((await refresh("SYM-z")).outcome).toBe("updated");
    expect(artifact()).toStrictEqual({
      status: "legacy",
      coordinates: { "SYM-a": ALPHA, "SYM-z": ALPHA },
    } as never);
  });

  test("refuses a malformed artifact", async () => {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    write(".kb/symbol-coordinates.yaml", "- 1\n");
    expect(await errorOf(() => refresh("SYM-a"))).toStrictEqual({
      name: "CoordinateArtifactError",
      message: "artifact root is not a mapping",
    });
  });

  test("anchors a coarse symbol the analyzer cannot place", async () => {
    manifest({
      id: "SYM-a",
      title: "alpha",
      sourceFile: "src/a.ts",
      granularity_reason: "extractor-miss",
    });
    write("src/a.ts", "const x = 1;\n");
    expect((await refresh("SYM-a")).outcome).toBe("updated");
    expect(
      (artifact() as { coordinates: Record<string, unknown> }).coordinates[
        "SYM-a"
      ],
    ).toMatchObject(
      coarseCoordinateSpan("src/a.ts", "alpha", "const x = 1;\n"),
    );
  });
});

describe("a symbol that cannot be placed", () => {
  test("names why", async () => {
    manifest(
      { id: "SYM-m", title: "missing", sourceFile: "src/a.ts" },
      { id: "SYM-x", title: "alpha", sourceFile: "src/x.ts" },
      { id: "SYM-e", title: "alpha" },
      { id: "SYM-t", title: 3, sourceFile: "src/a.ts" },
      {
        id: "SYM-c",
        title: "missing",
        sourceFile: "src/x.ts",
        granularity_reason: "extractor-miss",
      },
      {
        id: "SYM-n",
        title: "alpha",
        sourceFile: "src/a.ts",
        granularity_reason: "other",
      },
    );
    write("src/a.ts", "const x = 1;\n");
    const outcomes: Record<string, unknown> = {};
    for (const id of ["SYM-m", "SYM-x", "SYM-e", "SYM-t", "SYM-c", "SYM-n"])
      outcomes[id] = await refresh(id);
    expect(outcomes).toStrictEqual({
      "SYM-m": {
        refreshed: false,
        found: true,
        unplaced: "no declaration titled missing was found in src/a.ts",
      },
      "SYM-x": {
        refreshed: false,
        found: true,
        unplaced: "src/x.ts does not exist",
      },
      "SYM-e": {
        refreshed: false,
        found: true,
        unplaced: "its source file cannot be read",
      },
      "SYM-t": {
        refreshed: false,
        found: true,
        unplaced: "no declaration titled  was found in src/a.ts",
      },
      "SYM-c": {
        refreshed: false,
        found: true,
        unplaced: "src/x.ts does not exist",
      },
      "SYM-n": {
        refreshed: false,
        found: true,
        unplaced: "no declaration titled alpha was found in src/a.ts",
      },
    });
    expect(existsSync(ARTIFACT())).toBe(false);
  });

  test("drops its stale record", async () => {
    manifest(
      { id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" },
      { id: "SYM-b", title: "alpha", sourceFile: "src/a.ts" },
    );
    await refresh("SYM-a");
    await refresh("SYM-b");
    const before = readFileSync(ARTIFACT(), "utf8");
    write("src/a.ts", "const x = 1;\n");
    expect(plain(await refresh("SYM-a"))).toStrictEqual({
      refreshed: true,
      found: true,
      outcome: "removed",
      publication: {
        path: ARTIFACT(),
        beforeHash: sha(before),
        afterHash: sha(readFileSync(ARTIFACT(), "utf8")),
      },
    });
    expect(
      Object.keys(
        (artifact() as { coordinates: Record<string, unknown> }).coordinates,
      ),
    ).toStrictEqual(["SYM-b"]);
  });
});

describe("a symbol the manifest no longer declares", () => {
  test("is not found without a record", async () => {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    expect(await refresh("SYM-gone")).toStrictEqual({
      refreshed: false,
      found: false,
      outcome: "not_found",
    });
    expect(existsSync(ARTIFACT())).toBe(false);
  });

  test("loses its generated record, in the artifact's own format", async () => {
    manifest(
      { id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" },
      { id: "SYM-b", title: "alpha", sourceFile: "src/a.ts" },
    );
    await refresh("SYM-a");
    await refresh("SYM-b");
    manifest({ id: "SYM-b", title: "alpha", sourceFile: "src/a.ts" });
    const result = await refresh("SYM-a");
    expect({ ...plain(result), publication: undefined }).toStrictEqual({
      refreshed: true,
      found: false,
      outcome: "removed",
      publication: undefined,
    });
    expect(artifact().status).toBe("parsed");
    expect(
      Object.keys(
        (artifact() as { coordinates: Record<string, unknown> }).coordinates,
      ),
    ).toStrictEqual(["SYM-b"]);

    write(
      ".kb/symbol-coordinates.yaml",
      "coordinates:\n  SYM-a:\n    sourceFile: src/a.ts\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1\n  SYM-c:\n    sourceFile: src/a.ts\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1\n",
    );
    manifest({ id: "SYM-b", title: "alpha", sourceFile: "src/a.ts" });
    await refresh("SYM-a");
    expect(artifact()).toStrictEqual({
      status: "legacy",
      coordinates: {
        "SYM-c": {
          sourceFile: "src/a.ts",
          sourceLine: 1,
          sourceColumn: 0,
          sourceEndLine: 1,
          sourceEndColumn: 1,
        },
      },
    } as never);
  });
});

describe("publication receipts", () => {
  async function published(before?: string) {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    if (before !== undefined) write(".kb/symbol-coordinates.yaml", before);
    return (await refresh("SYM-a")).publication as NonNullable<
      RefreshResult["publication"]
    >;
  }

  test("rollback restores the previous artifact or removes a new one", async () => {
    const fresh = await published();
    fresh.rollback();
    expect(existsSync(ARTIFACT())).toBe(false);
    const legacy = "coordinates: {}\n";
    const replaced = await published(legacy);
    expect(replaced.beforeHash).toBe(sha(legacy));
    replaced.rollback();
    expect(readFileSync(ARTIFACT(), "utf8")).toBe(legacy);
  });

  test("rollback refuses an artifact that changed or vanished", async () => {
    const changed = await published();
    write(".kb/symbol-coordinates.yaml", "coordinates: {}\n");
    expect(await errorOf(async () => changed.rollback())).toStrictEqual({
      name: "CoordinateArtifactError",
      message: `coordinate artifact changed after publication; refusing rollback: ${ARTIFACT()}`,
    });
    rmSync(ARTIFACT());
    expect(await errorOf(async () => changed.rollback())).toStrictEqual({
      name: "CoordinateArtifactError",
      message: `coordinate artifact disappeared before rollback: ${ARTIFACT()}`,
    });
  });
});

describe("restoreOrUnlinkCoordinateArtifact", () => {
  test("restores content or removes the file", () => {
    const target = write("out.yaml", "new");
    restoreOrUnlinkCoordinateArtifact(target, "old");
    expect(readFileSync(target, "utf8")).toBe("old");
    restoreOrUnlinkCoordinateArtifact(target, null);
    expect(existsSync(target)).toBe(false);
  });

  test("cleans up its temporary file when the rename fails", async () => {
    const target = path.join(root, "busy");
    write("busy/inner", "x");
    expect(
      (
        (await errorOf(async () =>
          restoreOrUnlinkCoordinateArtifact(target, "old"),
        )) as { name: string }
      ).name,
    ).toBeDefined();
    expect(readdirSync(root).sort()).toStrictEqual(["busy", "src"]);
    const missingDir = path.join(root, "nowhere", "out.yaml");
    expect(
      await errorOf(async () =>
        restoreOrUnlinkCoordinateArtifact(missingDir, "x"),
      ),
    ).not.toBe("ok");
  });
});

describe("entry points", () => {
  test("the locked refresh holds the symbol compiler lock while reading", async () => {
    manifest({ id: "SYM-a", title: "alpha", sourceFile: "src/a.ts" });
    const lock = path.join(root, ".kb", ".symbol-compiler.lock");
    const held: boolean[] = [];
    const base = context();
    const result = await refreshSymbolCoordinates("SYM-a", {
      ...base,
      fs: {
        ...(base.fs as NonNullable<OperationContext["fs"]>),
        readFile: async (file: string) => {
          held.push(existsSync(lock));
          return readFile(file, "utf8");
        },
      },
    });
    expect(result.outcome).toBe("updated");
    expect(held).toStrictEqual([true]);
    expect(existsSync(lock)).toBe(false);
  });

  test("a substituted implementation replaces every entry point", async () => {
    const calls: string[] = [];
    setSymbolRefreshForTests(async (id, given) => {
      calls.push(`${id}:${given.workspaceRoot === root}`);
      return { refreshed: false, found: true };
    });
    const given = context();
    for (const run of [
      () => refreshSymbolCoordinates("A", given),
      () => refreshSymbolCoordinatesUnlocked("B", given),
      () => refreshSymbolCoordinatesForManifest("C", "/none", given),
    ]) {
      expect(await run()).toStrictEqual({ refreshed: false, found: true });
    }
    expect(calls).toStrictEqual(["A:true", "B:true", "C:true"]);
    expect(existsSync(path.join(root, ".kb"))).toBe(false);
    setSymbolRefreshForTests(undefined);
    expect(
      await refreshSymbolCoordinatesUnlocked("A", { ...given, fs: undefined }),
    ).toStrictEqual({
      refreshed: false,
      found: false,
    });
  });
});
