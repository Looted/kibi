import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import { SyncError } from "../../../src/commands/sync/errors.js";
import {
  COARSE_GRANULARITY_REASONS,
  SYMBOLS_MANIFEST_COMMENT_BLOCK,
  hasAllGeneratedCoordinates,
  isCoarseGranularityAnchor,
  isEligibleForCoordinateRefresh,
  normalizeManifestLayout,
  refreshManifestCoordinates,
} from "../../../src/commands/sync/manifest.js";
import {
  coordinateIdentityHash,
  coordinateSourceHash,
  parseCoordinateArtifact,
  writeCoordinateArtifact,
} from "../../../src/extractors/symbol-coordinates.js";
import type { ManifestSymbolEntry } from "../../../src/extractors/symbols-coordinator.js";
import {
  createTempDir,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

// Coordinate refresh over an in-memory workspace: every filesystem call and
// the coordinate extractor are injected, so each branch is observable.

const ROOT = "/kibi-manifest-mutation-ws";
const MANIFEST = `${ROOT}/.kb/symbols.yaml`;
const ARTIFACT = `${ROOT}/.kb/symbol-coordinates.yaml`;

type Entry = Record<string, unknown>;

class MemoryFs {
  readonly files = new Map<string, string>();
  readonly reads: string[] = [];
  readonly writes: string[] = [];
  readonly renames: Array<[string, string]> = [];
  readonly unlinks: string[] = [];
  failRename: ((from: string, to: string) => Error | null) | null = null;
  failUnlink = false;

  deps() {
    return {
      existsSync: ((file: string) => this.files.has(String(file))) as never,
      readFileSync: ((file: string) => {
        this.reads.push(String(file));
        const content = this.files.get(String(file));
        if (content === undefined) throw new Error(`ENOENT ${file}`);
        return content;
      }) as never,
      writeFileSync: ((file: string, content: string) => {
        this.writes.push(String(file));
        this.files.set(String(file), String(content));
      }) as never,
      renameSync: ((from: string, to: string) => {
        this.renames.push([String(from), String(to)]);
        const failure = this.failRename?.(String(from), String(to)) ?? null;
        if (failure !== null) throw failure;
        const content = this.files.get(String(from)) ?? "";
        this.files.delete(String(from));
        this.files.set(String(to), content);
      }) as never,
      unlinkSync: ((file: string) => {
        this.unlinks.push(String(file));
        if (this.failUnlink) throw new Error("unlink failed");
        this.files.delete(String(file));
      }) as never,
      resolveSymbolsManifestPaths: (() => ({
        symbolsPath: MANIFEST,
        coordinatesPath: ARTIFACT,
      })) as never,
    };
  }
}

const SPAN = {
  sourceLine: 1,
  sourceColumn: 0,
  sourceEndLine: 1,
  sourceEndColumn: 5,
};

let memory: MemoryFs;
let logs: string[];
let enrichCalls: Array<{ ids: unknown[]; options: unknown }>;
let restoreLog: () => void;

beforeEach(() => {
  memory = new MemoryFs();
  logs = [];
  enrichCalls = [];
  const log = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.join(" "));
  });
  restoreLog = () => log.mockRestore();
});

afterEach(() => {
  restoreLog();
});

function manifest(symbols: unknown): void {
  memory.files.set(MANIFEST, dumpYAML({ symbols }));
}

/** An extractor that applies the spans listed per symbol id. */
function enricher(results: Record<string, Entry> = {}) {
  return async (
    entries: ManifestSymbolEntry[],
    root: string,
    options: unknown,
  ) => {
    expect(root).toBe(ROOT);
    enrichCalls.push({ ids: entries.map((entry) => entry.id), options });
    return entries.map((entry) => ({
      ...entry,
      ...(results[String(entry.id ?? entry.title)] ?? {}),
    })) as ManifestSymbolEntry[];
  };
}

function run(
  options: {
    refresh?: boolean;
    incremental?: boolean;
    quiet?: boolean;
    results?: Record<string, Entry>;
    extra?: Record<string, unknown>;
  } = {},
) {
  return refreshManifestCoordinates(MANIFEST, ROOT, {
    ...memory.deps(),
    enrichSymbolCoordinates: enricher(options.results) as never,
    ...(options.refresh === undefined
      ? {}
      : { refreshSymbolCoordinates: options.refresh }),
    ...(options.incremental === undefined
      ? {}
      : { incremental: options.incremental }),
    ...(options.quiet === undefined ? {} : { quiet: options.quiet }),
    ...options.extra,
  });
}

function artifact(): Record<string, Entry> {
  const parsed = parseCoordinateArtifact(memory.files.get(ARTIFACT) ?? "");
  if (parsed.status === "invalid") throw new Error(parsed.reason);
  return parsed.coordinates as unknown as Record<string, Entry>;
}

function writtenSymbols(): Entry[] {
  const content = memory.files.get(MANIFEST) ?? "";
  expect(content.startsWith(SYMBOLS_MANIFEST_COMMENT_BLOCK)).toBe(true);
  return (parseYAML(content) as { symbols: Entry[] }).symbols;
}

function bound(
  entry: Entry,
  sourceText: string,
  span: Record<string, number> = SPAN,
): Entry {
  return {
    sourceFile: entry.sourceFile,
    ...span,
    identityHash: coordinateIdentityHash({
      id: String(entry.id),
      title: entry.title as string,
      sourceFile: entry.sourceFile as string,
      granularity_reason: entry.granularity_reason as string,
    }),
    sourceHash: coordinateSourceHash(sourceText),
  };
}

describe("manifest validation", () => {
  test.each([[["a"]], [null], ["text"], [7]])(
    "refuses a manifest root of %p",
    async (root) => {
      memory.files.set(MANIFEST, JSON.stringify(root));
      const error = await run().catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(SyncError);
      expect(error).toMatchObject({
        message: `symbols manifest ${MANIFEST} is not a YAML object; refusing coordinate refresh`,
        code: "SYMBOLS_MANIFEST_INVALID",
      });
    },
  );

  test("refuses a manifest without a symbols array", async () => {
    memory.files.set(MANIFEST, "symbols: {}\n");
    await expect(run()).rejects.toMatchObject({
      message: `symbols manifest ${MANIFEST} has no symbols array; refusing coordinate refresh`,
      code: "SYMBOLS_MANIFEST_INVALID",
    });
  });

  test("refuses a damaged artifact unless the refresh is incremental", async () => {
    manifest([]);
    memory.files.set(ARTIFACT, "coordinates: [unclosed\n");
    const error = await run({ refresh: true }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(SyncError);
    expect(error).toMatchObject({ code: "COORDINATE_ARTIFACT_INVALID" });
    expect(String((error as Error).message)).toStartWith(
      `Failed to parse coordinate artifact ${ARTIFACT}: `,
    );
    expect(await run({ incremental: true })).toEqual({ artifactChanged: true });
    expect(artifact()).toEqual({});
  });
});

describe("manifest normalization without a refresh", () => {
  test("strips generated fields and counts changed coordinates", async () => {
    manifest([
      { id: "A", title: "a", sourceFile: "src/a.ts", sourceLine: 9 },
      {
        id: "B",
        title: "b",
        status: "active",
        coordinatesGeneratedAt: "2026-01-01",
        coordinateRefreshFailure: "old",
      },
      "not a record",
    ]);
    const write = spyOn({ writeCoordinateArtifact }, "writeCoordinateArtifact");
    const result = await run({
      results: { A: { sourceFile: "src/a.ts", ...SPAN } },
      extra: { writeCoordinateArtifact: write },
    });
    expect(result).toEqual({ artifactChanged: false });
    expect(write).not.toHaveBeenCalled();
    expect(enrichCalls).toEqual([
      { ids: ["A", "B", undefined], options: undefined },
    ]);
    expect(writtenSymbols()).toEqual([
      { id: "A", title: "a", sourceFile: "src/a.ts" },
      { id: "B", title: "b", status: "active" },
      {},
    ]);
    expect(memory.files.has(ARTIFACT)).toBe(false);
    expect(logs.slice(0, 2)).toEqual([
      "✓ Normalized symbol manifest .kb/symbols.yaml (refreshed=1, unchanged=1, failed=1)",
      "  failed B: old",
    ]);
  });

  test("leaves an already normalized manifest untouched", async () => {
    memory.files.set(
      MANIFEST,
      `${SYMBOLS_MANIFEST_COMMENT_BLOCK}${dumpYAML({ symbols: [] }, { lineWidth: -1, noRefs: true, sortKeys: false })}`,
    );
    await run({ quiet: true });
    expect(memory.writes).toEqual([]);
    expect(logs).toEqual([]);
  });

  test("works with the default dependencies", async () => {
    const root = createTempDir("kibi-manifest-defaults-");
    try {
      const manifestPath = path.join(root, ".kb", "symbols.yaml");
      mkdirSync(path.dirname(manifestPath), { recursive: true });
      writeFileSync(manifestPath, "symbols: []\n");
      expect(await refreshManifestCoordinates(manifestPath, root)).toEqual({
        artifactChanged: false,
      });
      expect(readFileSync(manifestPath).toString()).toBe(
        `${SYMBOLS_MANIFEST_COMMENT_BLOCK}symbols: []\n`,
      );
      expect(logs).toEqual([
        "✓ Normalized symbol manifest .kb/symbols.yaml (refreshed=0, unchanged=0, failed=0)",
      ]);
    } finally {
      removeTempDir(root);
    }
  });
});

describe("coordinate refresh", () => {
  test("binds extracted spans and reports misses", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    memory.files.set(`${ROOT}/src/b.ts`, "bravo\n");
    manifest([
      { id: "A", title: "alpha", sourceFile: "src/a.ts" },
      { id: "NOFILE", title: "x", sourceFile: 7 },
      { id: "NOLINE", title: "x", sourceFile: "src/a.ts" },
      { id: "NOCOL", title: "x", sourceFile: "src/a.ts" },
      { id: "NOENDLINE", title: "x", sourceFile: "src/a.ts" },
      { id: "NOENDCOL", title: "x", sourceFile: "src/a.ts" },
      { id: "MISS", title: "missing", sourceFile: "src/b.ts" },
      { title: "anonymous", sourceFile: "src/b.ts" },
      { title: "spanned", sourceFile: "src/b.ts" },
      { id: "5", title: "five", sourceFile: "src/b.ts" },
      { id: 5, title: "numeric", sourceFile: "src/b.ts" },
      { id: "NOTITLE", sourceFile: "src/b.ts" },
      { id: "MOVED", title: "m", sourceFile: "src/gone.ts" },
      {
        id: "NAMED",
        title: "y",
        sourceFile: "src/b.ts",
        coordinateRefreshFailure: "a private class member",
      },
    ]);
    const { sourceLine, sourceColumn, sourceEndLine, sourceEndColumn } = SPAN;
    const result = await run({
      refresh: true,
      results: {
        A: { sourceFile: "src/a.ts", ...SPAN },
        NOFILE: { ...SPAN },
        NOLINE: { sourceColumn, sourceEndLine, sourceEndColumn },
        NOCOL: { sourceLine, sourceEndLine, sourceEndColumn },
        NOENDLINE: { sourceLine, sourceColumn, sourceEndColumn },
        NOENDCOL: { sourceLine, sourceColumn, sourceEndLine },
        spanned: { sourceFile: "src/b.ts", ...SPAN },
        "5": { sourceFile: "src/b.ts", ...SPAN },
        MOVED: { sourceFile: "src/b.ts" },
      },
    });
    expect(result).toEqual({ artifactChanged: true });
    expect(enrichCalls[0]?.options).toEqual({
      allowPythonDecoratorCoordinates: true,
    });
    expect(artifact()).toEqual({
      A: bound(
        { id: "A", title: "alpha", sourceFile: "src/a.ts" },
        "alpha beta\n",
      ),
      "5": bound({ id: "5", title: "five", sourceFile: "src/b.ts" }, "bravo\n"),
    });
    expect(memory.renames).toEqual([
      [`${MANIFEST}.kibi-tmp-${process.pid}`, MANIFEST],
      [`${ARTIFACT}.kibi-tmp-${process.pid}`, ARTIFACT],
    ]);
    expect(logs).toEqual([
      "✓ Refreshed symbol coordinates in .kb/symbol-coordinates.yaml (refreshed=2, unchanged=3, failed=9)",
      "  failed NOLINE: no unique declaration titled 'x' was found in src/a.ts; use the name the extractor gives the declaration",
      "  failed NOCOL: no unique declaration titled 'x' was found in src/a.ts; use the name the extractor gives the declaration",
      "  failed NOENDLINE: no unique declaration titled 'x' was found in src/a.ts; use the name the extractor gives the declaration",
      "  failed NOENDCOL: no unique declaration titled 'x' was found in src/a.ts; use the name the extractor gives the declaration",
      "  failed MISS: no unique declaration titled 'missing' was found in src/b.ts; use the name the extractor gives the declaration",
      "  failed #7: no unique declaration titled 'anonymous' was found in src/b.ts; use the name the extractor gives the declaration",
      "  failed NOTITLE: no unique declaration titled '' was found in src/b.ts; use the name the extractor gives the declaration",
      "  failed MOVED: no unique declaration titled 'm' was found in src/b.ts; use the name the extractor gives the declaration",
      "  failed NAMED: a private class member",
      `  Symbols without a published coordinate entry are dropped from coverage until they succeed. To link a whole file instead, add symbol_role and granularity_reason (${COARSE_GRANULARITY_REASONS.join(", ")}) to the symbol.`,
    ]);
  });

  test("anchors coarse symbols to a title line or the whole file", async () => {
    const suite = "describe('x', () => {});\n// Stryker was here!x\nend\n";
    memory.files.set(`${ROOT}/test/suite.ts`, suite);
    memory.files.set(`${ROOT}/config.yaml`, "a: 1\nkey: value\n");
    manifest([
      {
        id: "SUITE",
        sourceFile: "test/suite.ts",
        granularity_reason: "test-suite",
      },
      {
        id: "TITLED",
        title: "key",
        sourceFile: "config.yaml",
        granularity_reason: "config-artifact",
      },
      { id: "NUMERIC", sourceFile: 3, granularity_reason: "test-suite" },
      { id: "GONE", sourceFile: "gone.ts", granularity_reason: "test-suite" },
      {
        id: "TITLE7",
        title: 7,
        sourceFile: "config.yaml",
        granularity_reason: "config-artifact",
      },
    ]);
    await run({ refresh: true });
    const coordinates = artifact();
    expect(Object.keys(coordinates)).toEqual(["SUITE", "TITLE7", "TITLED"]);
    expect(coordinates.SUITE).toMatchObject({
      sourceFile: "test/suite.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 4,
    });
    expect(coordinates.TITLED).toMatchObject({
      sourceLine: 2,
      sourceColumn: 0,
      sourceEndLine: 2,
      sourceEndColumn: 3,
    });
    expect(coordinates.TITLE7).toMatchObject({
      sourceLine: 1,
      sourceEndLine: 3,
    });
    expect(logs[0]).toContain("(refreshed=3, unchanged=2, failed=0)");
  });

  test("skips spans whose source cannot be read or escapes the workspace", async () => {
    manifest([
      { id: "OUT", title: "x", sourceFile: "../outside.ts" },
      { id: "BROKEN", title: "x", sourceFile: "src/broken.ts" },
    ]);
    const deps = memory.deps();
    await refreshManifestCoordinates(MANIFEST, ROOT, {
      ...deps,
      existsSync: ((file: string) => file !== ARTIFACT) as never,
      readFileSync: ((file: string) => {
        if (file === MANIFEST) return memory.files.get(MANIFEST);
        if (String(file).endsWith("broken.ts")) throw new Error("EIO");
        return "x\n";
      }) as never,
      enrichSymbolCoordinates: enricher({
        OUT: { sourceFile: "../outside.ts", ...SPAN },
        BROKEN: { sourceFile: "src/broken.ts", ...SPAN },
      }) as never,
      refreshSymbolCoordinates: true,
    });
    expect(artifact()).toEqual({});
  });

  test("counts an unchanged stored span as unchanged", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha\n");
    memory.files.set(`${ROOT}/src/b.ts`, "alpha\n");
    const a = { id: "A", title: "alpha", sourceFile: "src/a.ts" };
    const b = { id: "B", title: "alpha", sourceFile: "src/a.ts" };
    const c = { id: "C", title: "alpha", sourceFile: "src/a.ts" };
    manifest([a, b, c]);
    memory.files.set(
      ARTIFACT,
      writeCoordinateArtifact({
        A: bound(a, "alpha\n") as never,
        B: bound({ ...b, sourceFile: "src/b.ts" }, "alpha\n") as never,
        C: bound(c, "alpha\n", { ...SPAN, sourceEndColumn: 4 }) as never,
      }),
    );
    await run({
      refresh: true,
      results: {
        A: { sourceFile: "src/a.ts", ...SPAN },
        B: { sourceFile: "src/a.ts", ...SPAN },
        C: { sourceFile: "src/a.ts", ...SPAN },
      },
    });
    expect(logs[0]).toContain("(refreshed=2, unchanged=1, failed=0)");
    expect(enrichCalls[0]?.ids).toEqual(["A", "B", "C"]);
  });

  test("falls back to the authored source file to judge eligibility", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha\n");
    manifest([
      { id: "DROPPED", title: "x", sourceFile: "src/a.ts" },
      { id: "NONE", title: "x" },
    ]);
    await refreshManifestCoordinates(MANIFEST, ROOT, {
      ...memory.deps(),
      enrichSymbolCoordinates: (async (entries: ManifestSymbolEntry[]) =>
        entries.map(({ sourceFile: _drop, ...rest }) => rest)) as never,
      refreshSymbolCoordinates: true,
    });
    expect(logs[0]).toContain("(refreshed=0, unchanged=1, failed=1)");
    expect(logs[1]).toBe(
      "  failed DROPPED: no unique declaration titled 'x' was found in its source file; use the name the extractor gives the declaration",
    );
  });

  test("reports active symbols whose source is missing", async () => {
    manifest([
      {
        id: "ACTIVE",
        title: "x",
        sourceFile: "gone.ts",
        coordinateRefreshFailure: "gone",
      },
      {
        id: "RETIRED",
        title: "x",
        sourceFile: "gone.ts",
        status: "retired",
        coordinateRefreshFailure: "gone",
      },
      { id: "QUIET", title: "x", sourceFile: "gone.ts" },
      ...["deprecated", "removed", "superseded"].map((status) => ({
        id: status,
        title: "x",
        sourceFile: "gone.ts",
        status,
        coordinateRefreshFailure: "gone",
      })),
      {
        id: "COARSE",
        sourceFile: "gone.ts",
        granularity_reason: "test-suite",
        coordinateRefreshFailure: "gone",
      },
    ]);
    await run({ refresh: true });
    expect(logs.slice(0, 2)).toEqual([
      "✓ Refreshed symbol coordinates in .kb/symbol-coordinates.yaml (refreshed=0, unchanged=6, failed=1)",
      "  failed ACTIVE: gone",
    ]);
  });

  test("lists ten failures and counts the rest", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha\n");
    const entries = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `S${String(index).padStart(2, "0")}`,
        title: "missing",
        sourceFile: "src/a.ts",
      }));
    manifest(entries(11));
    await run({ refresh: true });
    expect(logs).toHaveLength(13);
    expect(logs[11]).toBe("  ... and 1 more failed symbol(s)");
    logs.length = 0;
    manifest(entries(10));
    await run({ refresh: true });
    expect(logs).toHaveLength(12);
    expect(logs.some((line) => line.includes("more failed"))).toBe(false);
  });

  test("stays silent when asked", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha\n");
    manifest([{ id: "S", title: "missing", sourceFile: "src/a.ts" }]);
    await run({ refresh: true, quiet: true });
    expect(logs).toEqual([]);
    await run({ refresh: true, quiet: false });
    expect(logs).toHaveLength(3);
  });
});

describe("incremental refresh", () => {
  const A = { id: "A", title: "alpha", sourceFile: "src/a.ts" };
  const B = { id: "B", title: "beta", sourceFile: "src/a.ts" };

  function stored(entries: Record<string, Entry>): void {
    memory.files.set(ARTIFACT, writeCoordinateArtifact(entries as never));
  }

  test("reuses bound records without extracting or reading them twice", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    manifest([A, B]);
    stored({ A: bound(A, "alpha beta\n"), B: bound(B, "alpha beta\n") });
    const before = memory.files.get(ARTIFACT);
    expect(await run({ incremental: true })).toEqual({
      artifactChanged: false,
    });
    expect(enrichCalls).toEqual([]);
    expect(
      memory.reads.filter((file) => file.endsWith("src/a.ts")),
    ).toHaveLength(1);
    expect(memory.files.get(ARTIFACT)).toBe(before);
    expect(memory.writes).toEqual([]);
    expect(logs).toEqual([]);
  });

  test("reports reused records as unchanged instead of failed", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    memory.files.set(`${ROOT}/src/c.ts`, "gamma\n");
    const C = { id: "C", title: "gamma", sourceFile: "src/c.ts" };
    manifest([A, C]);
    stored({ A: bound(A, "alpha beta\n") });
    await run({
      incremental: true,
      results: { C: { sourceFile: "src/c.ts", ...SPAN } },
    });
    expect(enrichCalls.map((call) => call.ids)).toEqual([["C"]]);
    expect(Object.keys(artifact())).toEqual(["A", "C"]);
    expect(logs).toEqual([
      "✓ Refreshed symbol coordinates in .kb/symbol-coordinates.yaml (refreshed=1, unchanged=1, failed=0)",
    ]);
    expect(memory.files.get(MANIFEST)).not.toContain(
      SYMBOLS_MANIFEST_COMMENT_BLOCK,
    );
  });

  test("re-extracts records whose identity, source or binding changed", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    const numeric = { id: 5, title: "five", sourceFile: "src/a.ts" };
    const gone = { id: "GONE", title: "g", sourceFile: "src/gone.ts" };
    const reason = { ...A, id: "R", granularity_reason: "test-suite" };
    manifest([
      { ...A, title: "renamed" },
      B,
      numeric,
      gone,
      reason,
      { id: "NEW", title: "n", sourceFile: "src/a.ts" },
    ]);
    stored({
      A: bound(A, "alpha beta\n"),
      B: bound(B, "old text\n"),
      "5": bound({ ...numeric, id: "5" }, "alpha beta\n"),
      GONE: bound(gone, "g\n"),
      R: bound({ ...reason, granularity_reason: undefined }, "alpha beta\n"),
    });
    await run({ incremental: true });
    expect(enrichCalls.map((call) => call.ids)).toEqual([
      ["A", "B", 5, "GONE", "R", "NEW"],
    ]);
  });

  test("never reuses a record for a symbol without an id", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    const anonymous = { title: "alpha", sourceFile: "src/a.ts" };
    manifest([anonymous]);
    stored({
      undefined: bound({ ...anonymous, id: "undefined" }, "alpha beta\n"),
    });
    await run({ incremental: true });
    expect(enrichCalls.map((call) => call.ids)).toEqual([[undefined]]);
  });

  test("reports failures even when the artifact is unchanged", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    manifest([{ id: "MISS", title: "missing", sourceFile: "src/a.ts" }]);
    stored({});
    expect(await run({ incremental: true })).toEqual({
      artifactChanged: false,
    });
    expect(logs[0]).toBe(
      "✓ Refreshed symbol coordinates in .kb/symbol-coordinates.yaml (refreshed=0, unchanged=0, failed=1)",
    );
  });

  test("never reuses legacy records without bindings", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    manifest([A]);
    memory.files.set(
      ARTIFACT,
      dumpYAML({ coordinates: { A: { sourceFile: "src/a.ts", ...SPAN } } }),
    );
    await run({ incremental: true });
    expect(enrichCalls.map((call) => call.ids)).toEqual([["A"]]);
  });

  test("binds identity fields that are present", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha beta\n");
    const bare = { id: "BARE", sourceFile: "src/a.ts" };
    const full = {
      id: "FULL",
      title: "alpha",
      sourceFile: "src/a.ts",
      granularity_reason: "test-suite",
    };
    manifest([bare, full]);
    stored({
      BARE: bound(bare, "alpha beta\n"),
      FULL: bound(full, "alpha beta\n"),
    });
    await run({ incremental: true });
    expect(enrichCalls).toEqual([]);
  });
});

describe("publication", () => {
  test("removes the temporary file when the rename fails", async () => {
    manifest([]);
    memory.failRename = () => new Error("rename failed");
    await expect(run()).rejects.toThrow("rename failed");
    expect(memory.unlinks).toEqual([`${MANIFEST}.kibi-tmp-${process.pid}`]);
    expect(memory.files.has(`${MANIFEST}.kibi-tmp-${process.pid}`)).toBe(false);
  });

  test("keeps the original failure when cleanup fails", async () => {
    manifest([]);
    memory.failRename = () => new Error("rename failed");
    memory.failUnlink = true;
    await expect(run()).rejects.toThrow("rename failed");
  });

  test("rolls the manifest back when the artifact cannot be published", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha\n");
    manifest([{ id: "A", title: "alpha", sourceFile: "src/a.ts" }]);
    const original = memory.files.get(MANIFEST);
    const failure = new Error("artifact rename failed");
    memory.failRename = (_from, to) => (to === ARTIFACT ? failure : null);
    await expect(
      run({
        refresh: true,
        results: { A: { sourceFile: "src/a.ts", ...SPAN } },
      }),
    ).rejects.toBe(failure);
    expect(memory.files.get(MANIFEST)).toBe(original);
  });

  test("refuses to roll back a manifest that changed again", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha\n");
    manifest([{ id: "A", title: "alpha", sourceFile: "src/a.ts" }]);
    const failure = new Error("artifact rename failed");
    memory.failRename = (_from, to) => {
      if (to === MANIFEST) return null;
      memory.files.set(MANIFEST, "edited meanwhile\n");
      return failure;
    };
    const error = (await run({
      refresh: true,
      results: { A: { sourceFile: "src/a.ts", ...SPAN } },
    }).catch((caught: unknown) => caught)) as AggregateError;
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.message).toBe(
      `Coordinate artifact publication failed and manifest rollback failed: ${MANIFEST}`,
    );
    expect(error.errors[0]).toBe(failure);
    expect((error.errors[1] as Error).message).toBe(
      `symbol manifest changed after publication; refusing rollback: ${MANIFEST}`,
    );
    expect(memory.files.get(MANIFEST)).toBe("edited meanwhile\n");
  });

  test("does not roll back when only the artifact is published", async () => {
    memory.files.set(`${ROOT}/src/a.ts`, "alpha\n");
    memory.files.set(
      MANIFEST,
      `${SYMBOLS_MANIFEST_COMMENT_BLOCK}${dumpYAML(
        { symbols: [{ id: "A", title: "alpha", sourceFile: "src/a.ts" }] },
        { lineWidth: -1, noRefs: true, sortKeys: false },
      )}`,
    );
    const failure = new Error("artifact rename failed");
    memory.failRename = () => failure;
    await expect(
      run({
        refresh: true,
        results: { A: { sourceFile: "src/a.ts", ...SPAN } },
      }),
    ).rejects.toBe(failure);
    expect(memory.renames).toHaveLength(1);
  });
});

describe("normalizeManifestLayout", () => {
  test("rewrites a flow symbols list as block YAML", () => {
    memory.files.set(
      MANIFEST,
      "# keep\nsymbols: [ { id: A, title: a }, { id: B } ]\n",
    );
    expect(normalizeManifestLayout(MANIFEST, memory.deps())).toBe(2);
    expect(memory.files.get(MANIFEST)).toBe(
      "# keep\nsymbols:\n  - id: A\n    title: a\n  - id: B\n",
    );
    expect(normalizeManifestLayout(MANIFEST, memory.deps())).toBeNull();
    expect(memory.renames).toHaveLength(1);
  });

  test("keeps long values on one line", () => {
    const title = "long words ".repeat(12).trim();
    memory.files.set(MANIFEST, `symbols: [ { id: A, title: ${title} } ]\n`);
    expect(normalizeManifestLayout(MANIFEST, memory.deps())).toBe(1);
    expect(memory.files.get(MANIFEST)).toBe(
      `symbols:\n  - id: A\n    title: ${title}\n`,
    );
  });

  test.each([
    ["symbols: 5\n"],
    ["symbols: []\n"],
    ["symbols: {}\n"],
    ["other: [ { id: A } ]\n"],
    ["symbols:\n  - id: A\n"],
  ])("leaves %p alone", (content) => {
    memory.files.set(MANIFEST, content);
    expect(normalizeManifestLayout(MANIFEST, memory.deps())).toBeNull();
    expect(memory.writes).toEqual([]);
  });

  test("works with the default dependencies", () => {
    const root = createTempDir("kibi-manifest-layout-");
    try {
      const file = path.join(root, "symbols.yaml");
      writeFileSync(file, "symbols: [ { id: A } ]\n");
      expect(normalizeManifestLayout(file)).toBe(1);
      expect(readFileSync(file).toString()).toBe("symbols:\n  - id: A\n");
    } finally {
      removeTempDir(root);
    }
  });
});

describe("entry helpers", () => {
  test("hasAllGeneratedCoordinates needs every number", () => {
    expect(hasAllGeneratedCoordinates({ id: "A", title: "a", ...SPAN })).toBe(
      true,
    );
    for (const field of Object.keys(SPAN)) {
      expect(
        hasAllGeneratedCoordinates({ id: "A", ...SPAN, [field]: "1" } as never),
      ).toBe(false);
    }
  });

  test("isEligibleForCoordinateRefresh needs an existing confined file", () => {
    const deps = memory.deps();
    memory.files.set(`${ROOT}/src/a.ts`, "");
    expect(isEligibleForCoordinateRefresh("src/a.ts", ROOT, deps)).toBe(true);
    expect(isEligibleForCoordinateRefresh("src/b.ts", ROOT, deps)).toBe(false);
    expect(isEligibleForCoordinateRefresh(undefined, ROOT, deps)).toBe(false);
    expect(isEligibleForCoordinateRefresh("", ROOT, deps)).toBe(false);
    expect(
      isEligibleForCoordinateRefresh("../a.ts", ROOT, {
        existsSync: () => true,
      }),
    ).toBe(false);
  });

  test("isCoarseGranularityAnchor accepts only coarse reasons", () => {
    for (const reason of COARSE_GRANULARITY_REASONS) {
      expect(
        isCoarseGranularityAnchor({
          id: "A",
          granularity_reason: reason,
        } as never),
      ).toBe(true);
    }
    expect(isCoarseGranularityAnchor({ id: "A", title: "a" })).toBe(false);
  });

  test("the manifest header lists the coarse reasons", () => {
    expect(SYMBOLS_MANIFEST_COMMENT_BLOCK).toContain(
      `#   (${COARSE_GRANULARITY_REASONS.join(", ")}).\n`,
    );
  });
});
