// implements REQ-cli-status-pre-first-sync
import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { hashManifestWithCoordinates } from "../../src/commands/sync/cache.js";
import {
  MTIME_SOURCE_REASON_CODES,
  confirmMetaFreshness,
  confirmSourceNewerReasons,
} from "../../src/utils/content-freshness.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-freshness-evidence-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

/** A workspace with a store; files maps repo-relative paths to contents. */
function workspace(files: Record<string, string>): {
  root: string;
  store: string;
} {
  const root = path.join(base, `w${counter++}`);
  const store = path.join(root, ".kb", "branches", "main");
  mkdirSync(store, { recursive: true });
  for (const [file, contents] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), contents);
  }
  return { root, store };
}

function writeCache(store: string, hashes: unknown): void {
  writeFileSync(
    path.join(store, "sync-cache.json"),
    JSON.stringify({ version: 2, hashes, seenAt: {} }),
  );
}

function manifestHash(root: string, manifest: string): string {
  const absolute = path.join(root, manifest);
  return hashManifestWithCoordinates(
    root,
    absolute,
    path.join(path.dirname(absolute), "symbol-coordinates.yaml"),
  );
}

const reason = (file: unknown, code: unknown = "indexed_source_newer") => ({
  code,
  path: file,
});

function verdict(
  root: string,
  store: string,
  file: string,
): "dropped" | "kept" {
  const result = confirmSourceNewerReasons(root, store, [reason(file)]);
  return result.dropped.length === 1 ? "dropped" : "kept";
}

const coordinates = (rows: Array<[string, string]>) =>
  [
    "version: 2",
    "coordinates:",
    ...rows.flatMap(([file, hash], index) => [
      `  c${index}:`,
      `    sourceHash: ${hash}`,
      `    sourceFile: ${file}`,
    ]),
    "",
  ].join("\n");

describe("mtime reason codes", () => {
  test("only the three source-newer codes are content-confirmed", () => {
    expect([...MTIME_SOURCE_REASON_CODES].sort()).toStrictEqual([
      "documentation_source_newer",
      "indexed_source_newer",
      "knowledge_source_newer",
    ]);
    const { root, store } = workspace({ "a.md": "A" });
    writeCache(store, { "a.md": sha("A") });
    for (const code of MTIME_SOURCE_REASON_CODES) {
      expect(
        confirmSourceNewerReasons(root, store, [reason("a.md", code)]).dropped,
      ).toStrictEqual([reason("a.md", code)]);
    }
  });

  test("other reasons, and reasons without a string code or path, are kept", () => {
    const { root, store } = workspace({ "a.md": "A" });
    writeCache(store, { "a.md": sha("A") });
    const reasons = [
      reason("a.md", "schema_changed"),
      reason("a.md", 5),
      reason(5),
      { code: "indexed_source_newer" },
    ];
    expect(confirmSourceNewerReasons(root, store, reasons)).toStrictEqual({
      kept: reasons,
      dropped: [],
    });
  });
});

describe("sync-cache evidence", () => {
  test("a file matching its cached hash is unchanged, with either separator", () => {
    const { root, store } = workspace({ "docs/a.md": "A", "docs/b.md": "B" });
    writeCache(store, { "docs/a.md": sha("A"), "docs/b.md": sha("old") });
    expect(verdict(root, store, "docs/a.md")).toBe("dropped");
    expect(verdict(root, store, "docs\\a.md")).toBe("dropped");
    expect(verdict(root, store, "docs/b.md")).toBe("kept");
  });

  test("without a readable cache or hashes object nothing is confirmed", () => {
    const missing = workspace({ "a.md": "A" });
    expect(verdict(missing.root, missing.store, "a.md")).toBe("kept");
    for (const cache of ["{", "[1]", '"text"', '{"hashes":[1]}', "null"]) {
      const { root, store } = workspace({ "a.md": "A" });
      writeFileSync(path.join(store, "sync-cache.json"), cache);
      expect(verdict(root, store, "a.md")).toBe("kept");
    }
  });

  test("a missing file is never confirmed", () => {
    const { root, store } = workspace({});
    writeCache(store, { "gone.md": sha("") });
    expect(verdict(root, store, "gone.md")).toBe("kept");
  });
});

describe("coordinate artifact evidence", () => {
  test("every recorded source hash must match the file", () => {
    const { root, store } = workspace({
      "src/a.ts": "A",
      "src/b.ts": "B",
      ".kb/symbol-coordinates.yaml": coordinates([
        ["src/a.ts", sha("A")],
        ["src/b.ts", sha("B")],
        ["src/b.ts", sha("old B")],
      ]),
    });
    writeCache(store, {});
    expect(verdict(root, store, "src/a.ts")).toBe("dropped");
    expect(verdict(root, store, "src/b.ts")).toBe("kept");
  });

  test("rows without a string file or hash, and a malformed artifact, prove nothing", () => {
    const rows = workspace({
      "src/a.ts": "A",
      ".kb/symbol-coordinates.yaml": [
        "coordinates:",
        "  c0:",
        `    sourceHash: ${sha("A")}`,
        "  c1:",
        "    sourceFile: src/a.ts",
        "  c2: plain",
        "",
      ].join("\n"),
    });
    writeCache(rows.store, {});
    expect(verdict(rows.root, rows.store, "src/a.ts")).toBe("kept");
    for (const artifact of ["coordinates: [", "- a\n", "coordinates: [1]\n"]) {
      const { root, store } = workspace({
        "src/a.ts": "A",
        ".kb/symbol-coordinates.yaml": artifact,
      });
      writeCache(store, {});
      expect(verdict(root, store, "src/a.ts")).toBe("kept");
    }
  });

  test("invalid rows next to a valid one leave its evidence intact", () => {
    const { root, store } = workspace({
      "src/a.ts": "A",
      ".kb/symbol-coordinates.yaml": [
        "coordinates:",
        "  c0: plain",
        "  c1:",
        `    sourceHash: ${sha("A")}`,
        "    sourceFile: src/a.ts",
        "  c2:",
        "    sourceFile: src/a.ts",
        "",
      ].join("\n"),
    });
    writeCache(store, {});
    expect(verdict(root, store, "src/a.ts")).toBe("dropped");
  });

  test("a cached hash wins over the coordinate artifact", () => {
    const { root, store } = workspace({
      "src/a.ts": "A",
      ".kb/symbol-coordinates.yaml": coordinates([["src/a.ts", sha("A")]]),
    });
    writeCache(store, { "src/a.ts": sha("old") });
    expect(verdict(root, store, "src/a.ts")).toBe("kept");
  });
});

describe("symbols manifest evidence", () => {
  const MANIFEST = [
    "symbols:",
    "  - id: SYM-a",
    "    sourceFile: src/a.ts",
    "  - id: SYM-b",
    "    source: src\\b.ts",
    "  - id: SYM-c",
    "    sourceFile: ''",
    "  - id: SYM-d",
    "    sourceFile: 5",
    "  - id: SYM-e",
    "    sourceFile: [src/c.ts]",
    "  - plain",
    "",
  ].join("\n");

  function manifestWorkspace(match: boolean) {
    const ws = workspace({
      "src/a.ts": "A",
      "src/b.ts": "B",
      "src/c.ts": "C",
      ".kb/symbols.yaml": MANIFEST,
      ".kb/requirements/REQ-a.md": "R",
    });
    writeCache(ws.store, {
      ".kb/requirements/REQ-a.md": sha("R"),
      ".kb/symbols.yaml": match
        ? manifestHash(ws.root, ".kb/symbols.yaml")
        : "x",
    });
    return ws;
  }

  test("a matching manifest confirms itself and every source it references", () => {
    const { root, store } = manifestWorkspace(true);
    expect(verdict(root, store, ".kb/symbols.yaml")).toBe("dropped");
    expect(verdict(root, store, "src/a.ts")).toBe("dropped");
    expect(verdict(root, store, "src/b.ts")).toBe("dropped");
    expect(verdict(root, store, "src/c.ts")).toBe("kept");
    expect(
      confirmSourceNewerReasons(root, store, [
        reason("src/a.ts"),
        reason("src/b.ts"),
      ]).dropped,
    ).toHaveLength(2);
  });

  test("a changed manifest confirms neither itself nor its sources", () => {
    const { root, store } = manifestWorkspace(false);
    expect(verdict(root, store, ".kb/symbols.yaml")).toBe("kept");
    expect(verdict(root, store, "src/a.ts")).toBe("kept");
  });

  test("a missing manifest with a cached hash confirms nothing", () => {
    const { root, store } = workspace({ "src/a.ts": "A" });
    writeCache(store, { ".kb/symbols.yaml": "x" });
    expect(verdict(root, store, ".kb/symbols.yaml")).toBe("kept");
    expect(verdict(root, store, "src/a.ts")).toBe("kept");
  });

  test("a matching manifest without a symbols list still confirms itself", () => {
    for (const text of ["- a\n", "symbols: 5\n", ""]) {
      const { root, store } = workspace({ ".kb/symbols.yaml": text });
      writeCache(store, {
        ".kb/symbols.yaml": manifestHash(root, ".kb/symbols.yaml"),
      });
      expect(verdict(root, store, ".kb/symbols.yaml")).toBe("dropped");
    }
  });

  test("a manifest is only read through its cached composite hash", () => {
    const { root, store } = workspace({
      "src/a.ts": "A",
      ".kb/symbols.yaml": MANIFEST,
    });
    writeCache(store, {});
    expect(verdict(root, store, ".kb/symbols.yaml")).toBe("kept");
    expect(verdict(root, store, "src/a.ts")).toBe("kept");
  });

  test("a non-canonical YAML file never stands in for the symbols manifest", () => {
    const { root, store } = workspace({
      "src/a.ts": "A",
      "docs/extra.yaml": MANIFEST,
    });
    writeCache(store, {
      "docs/extra.yaml": manifestHash(root, "docs/extra.yaml"),
    });
    expect(verdict(root, store, "src/a.ts")).toBe("kept");
  });

  test("a non-string cached manifest hash is ignored", () => {
    const { root, store } = workspace({
      ".kb/symbols.yaml": MANIFEST,
      ".kb/symbol-coordinates.yaml": coordinates([
        [".kb/symbols.yaml", sha(MANIFEST)],
      ]),
    });
    writeCache(store, { ".kb/symbols.yaml": 5 });
    expect(verdict(root, store, ".kb/symbols.yaml")).toBe("dropped");
  });

  test("a manifest that references a missing file does not confirm it", () => {
    const { root, store } = workspace({
      ".kb/symbols.yaml":
        "symbols:\n  - id: SYM-a\n    sourceFile: src/gone.ts\n",
    });
    writeCache(store, {
      ".kb/symbols.yaml": manifestHash(root, ".kb/symbols.yaml"),
    });
    expect(verdict(root, store, ".kb/symbols.yaml")).toBe("dropped");
    expect(verdict(root, store, "src/gone.ts")).toBe("kept");
  });

  test("an unparsable manifest confirms nothing it references", () => {
    const { root, store } = workspace({
      "src/a.ts": "A",
      ".kb/symbols.yaml": "symbols: [\n  sourceFile: src/a.ts\n",
    });
    writeCache(store, {
      ".kb/symbols.yaml": manifestHash(root, ".kb/symbols.yaml"),
    });
    expect(verdict(root, store, "src/a.ts")).toBe("kept");
    const flat = workspace({
      "src/a.ts": "A",
      ".kb/symbols.yaml": "symbols: src/a.ts\n",
    });
    writeCache(flat.store, {
      ".kb/symbols.yaml": manifestHash(flat.root, ".kb/symbols.yaml"),
    });
    expect(verdict(flat.root, flat.store, "src/a.ts")).toBe("kept");
  });
});

describe("confirmMetaFreshness", () => {
  function fixture() {
    const ws = workspace({
      "a.md": "A",
      "b.md": "B",
      ".kb/symbol-coordinates.yaml": coordinates([["a.md", sha("A")]]),
    });
    writeCache(ws.store, { "a.md": sha("A"), "b.md": sha("old") });
    return ws;
  }
  const same = reason("a.md");
  const changed = reason("b.md");

  test("returns the payload itself when there is nothing to confirm", () => {
    const { root, store } = fixture();
    for (const payload of [
      {},
      { meta: { kbPath: 5, staleReasons: [same] } },
      { meta: { kbPath: store, staleReasons: "x" } },
      { meta: { kbPath: store, staleReasons: [changed] } },
    ]) {
      expect(confirmMetaFreshness(payload, root)).toBe(payload);
    }
  });

  test("a fully confirmed stale payload becomes fresh", () => {
    const { root, store } = fixture();
    expect<unknown>(
      confirmMetaFreshness(
        {
          rows: 1,
          meta: {
            kbPath: store,
            syncState: "stale",
            dirty: true,
            staleReasons: [same, "noise", [same]],
          },
        },
        root,
      ),
    ).toStrictEqual({
      rows: 1,
      meta: {
        kbPath: store,
        syncState: "fresh",
        dirty: false,
        staleReasons: [],
        staleReasonCount: 0,
      },
    });
  });

  test("stays stale while a reason is kept, the list is truncated, or the state is not stale", () => {
    const { root, store } = fixture();
    const run = (meta: Record<string, unknown>) =>
      confirmMetaFreshness(
        { meta: { kbPath: store, syncState: "stale", ...meta } },
        root,
      ).meta;
    expect<unknown>(run({ staleReasons: [same, changed] })).toStrictEqual({
      kbPath: store,
      syncState: "stale",
      staleReasons: [changed],
      staleReasonCount: 1,
    });
    expect<unknown>(
      run({
        staleReasons: [same],
        staleReasonsTruncated: true,
        staleReasonCount: 7,
      }),
    ).toStrictEqual({
      kbPath: store,
      syncState: "stale",
      staleReasons: [],
      staleReasonsTruncated: true,
      staleReasonCount: 6,
    });
    expect<unknown>(
      run({ staleReasons: [same], syncState: "unknown" }),
    ).toStrictEqual({
      kbPath: store,
      syncState: "unknown",
      staleReasons: [],
      staleReasonCount: 0,
    });
  });

  test("the count never drops below the reasons still carried", () => {
    const { root, store } = fixture();
    expect<unknown>(
      confirmMetaFreshness(
        {
          meta: {
            kbPath: store,
            staleReasons: [same, changed, changed],
            staleReasonCount: "9",
          },
        },
        root,
      ).meta?.staleReasonCount,
    ).toBe(2);
    expect(
      confirmMetaFreshness(
        {
          meta: {
            kbPath: store,
            staleReasons: [same, changed],
            staleReasonCount: 1,
          },
        },
        root,
      ).meta?.staleReasonCount,
    ).toBe(1);
  });
});
