import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  SOURCE_EXTRACTION_FAILED,
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
  SYNC_COMPILER_FINGERPRINT,
  compilerFingerprintReason,
  copySyncCache,
  failedSourceKeepsSemanticBaseline,
  hashFile,
  hashManifestWithCoordinates,
  hashNormalized,
  readSyncCache,
  sourceExtractionFailure,
  sourceExtractionFailureReasons,
  sourceExtractionRemediation,
  toCacheKey,
  writeSyncCache,
} from "../../../src/commands/sync/cache.js";
import entitySchema from "../../../src/schemas/entity.schema.json" with {
  type: "json",
};
import {
  createTempDir,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempRoot(): string {
  const root = createTempDir("kibi-cache-mut-");
  roots.push(root);
  return root;
}

const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

function write(root: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

const EMPTY = {
  version: 2,
  hashes: {},
  seenAt: {},
  semanticHashes: {},
  semanticContracts: {},
};

describe("constants", () => {
  test("pin the cache contract", () => {
    expect(SYNC_CACHE_VERSION).toBe(2);
    expect(SYNC_CACHE_TTL_MS).toBe(2_592_000_000);
    expect(SOURCE_EXTRACTION_FAILED).toBe("source_extraction_failed");
    expect(SYNC_COMPILER_FINGERPRINT).toBe(sha(JSON.stringify(entitySchema)));
  });
});

describe("failedSourceKeepsSemanticBaseline", () => {
  test("keeps the baseline only for unchanged or legacy prose", () => {
    const keeps = (failure: Record<string, unknown>) =>
      failedSourceKeepsSemanticBaseline(
        { hash: "h", message: "m", ...failure },
        "S",
      );
    expect(keeps({ semanticContract: true, baseline: true })).toBe(false);
    expect(keeps({ semanticContract: false, baseline: true })).toBe(true);
    expect(keeps({ baseline: true })).toBe(true);
    expect(keeps({ baseline: false })).toBe(false);
    expect(keeps({})).toBe(false);
    expect(keeps({ semanticHash: "S", baseline: false })).toBe(true);
    expect(keeps({ semanticHash: "T", baseline: true })).toBe(false);
  });
});

describe("extraction failure records", () => {
  function store(root: string, cache: unknown): string {
    const storePath = path.join(root, "store");
    mkdirSync(storePath, { recursive: true });
    writeFileSync(
      path.join(storePath, "sync-cache.json"),
      typeof cache === "string" ? cache : JSON.stringify(cache),
    );
    return storePath;
  }

  test("sourceExtractionFailure looks a file up by its cache key", () => {
    const root = tempRoot();
    const failure = { hash: "h", message: "bad" };
    const storePath = store(root, {
      extractionFailures: { ".kb/requirements/r.md": failure },
    });
    for (const file of [
      ".kb/requirements/r.md",
      path.join(root, ".kb", "requirements", "r.md"),
      "./.kb/requirements/../requirements/r.md",
    ]) {
      expect(sourceExtractionFailure(root, storePath, file)).toStrictEqual(
        failure,
      );
    }
    expect(
      sourceExtractionFailure(root, storePath, "other.md"),
    ).toBeUndefined();
  });

  test("a missing, broken or odd cache records no failures", () => {
    const root = tempRoot();
    expect(
      sourceExtractionFailure(root, path.join(root, "none"), "a.md"),
    ).toBeUndefined();
    for (const cache of [
      "{",
      "null",
      { extractionFailures: null },
      { extractionFailures: "a.md" },
      {},
    ]) {
      const storePath = store(root, cache);
      expect(sourceExtractionFailure(root, storePath, "a.md")).toBeUndefined();
      expect(sourceExtractionFailureReasons(root, storePath)).toStrictEqual([]);
    }
  });

  test("reports only sources that still hold the failing bytes", () => {
    const root = tempRoot();
    write(root, {
      "b.md": "broken b",
      "a.md": "broken a",
      "edited.md": "new bytes",
      "null.md": "present",
    });
    const storePath = store(root, {
      extractionFailures: {
        "b.md": { hash: sha("broken b"), message: "b/status is not allowed" },
        "a.md": { hash: sha("broken a"), message: 5 },
        "edited.md": { hash: sha("old bytes"), message: "x" },
        "gone.md": { hash: sha("x"), message: "x" },
        "gone-unhashed.md": { message: "x" },
        "null.md": null,
      },
    });
    expect(sourceExtractionFailureReasons(root, storePath)).toStrictEqual([
      {
        code: "source_extraction_failed",
        path: "a.md",
        entityIds: [],
        detail:
          "a.md cannot be compiled, so the entities it declares are missing from the KB: 5",
        remediation: sourceExtractionRemediation("a.md", "5"),
        blocking: true,
      },
      {
        code: "source_extraction_failed",
        path: "b.md",
        entityIds: [],
        detail:
          "b.md cannot be compiled, so the entities it declares are missing from the KB: b/status is not allowed",
        remediation: sourceExtractionRemediation(
          "b.md",
          "b/status is not allowed",
        ),
        blocking: true,
      },
    ]);
  });

  test("names the right repair", () => {
    expect(sourceExtractionRemediation("r.md", "data/status must be")).toBe(
      "Run 'kibi migrate --yes' to map a legacy requirement status (implemented, done and completed become closed with the tag implemented), or set status in r.md to a status Kibi knows (open, in_progress, closed or retired for a requirement); then run kibi sync.",
    );
    for (const message of ["data/statuses x", "status bad", "x/title"]) {
      expect(sourceExtractionRemediation("r.md", message)).toBe(
        "Fix the front matter of r.md named in the error (edit the file, or rewrite the entity with kb_upsert so the write replaces the failing field), then run kibi sync.",
      );
    }
  });
});

describe("compilerFingerprintReason", () => {
  function storeWith(root: string, content: string | null): string {
    const storePath = path.join(root, "store");
    mkdirSync(storePath, { recursive: true });
    if (content !== null)
      writeFileSync(path.join(storePath, "sync-cache.json"), content);
    return storePath;
  }

  test("is silent for a current, missing or broken cache", () => {
    const root = tempRoot();
    expect(compilerFingerprintReason(storeWith(root, null))).toBeNull();
    expect(compilerFingerprintReason(storeWith(root, "{"))).toBeNull();
    expect(
      compilerFingerprintReason(
        storeWith(
          root,
          JSON.stringify({ compilerFingerprint: SYNC_COMPILER_FINGERPRINT }),
        ),
      ),
    ).toBeNull();
  });

  test("reports a different or unrecorded compiler", () => {
    const root = tempRoot();
    const tail =
      " so unchanged sources may lack properties this CLI keeps. The next kibi sync re-imports every source.";
    const reason = (detail: string, storePath: string) => ({
      code: "compiler_changed",
      path: path.join(storePath, "sync-cache.json"),
      entityIds: [],
      detail,
      remediation: { command_argv: ["kibi", "sync"], applyRequired: false },
    });
    const other = storeWith(root, JSON.stringify({ compilerFingerprint: "x" }));
    expect(compilerFingerprintReason(other)).toStrictEqual(
      reason(
        `The branch KB was compiled by a Kibi CLI with a different entity property contract,${tail}`,
        other,
      ),
    );
    for (const cache of [{}, { compilerFingerprint: 5 }]) {
      const none = storeWith(root, JSON.stringify(cache));
      expect(compilerFingerprintReason(none)).toStrictEqual(
        reason(
          `The branch KB was compiled by a Kibi CLI that did not record its entity property contract,${tail}`,
          none,
        ),
      );
    }
  });
});

describe("hashing", () => {
  test("toCacheKey is workspace relative with forward slashes", () => {
    expect(toCacheKey("/w", "/w/a/b.md")).toBe("a/b.md");
    expect(toCacheKey("/w/", "a/./b.md")).toBe("a/b.md");
    expect(toCacheKey("/w", "/w/x/../a.md")).toBe("a.md");
    expect(toCacheKey("/w", "/other/a.md")).toBe("../other/a.md");
  });

  test("hashFile hashes the bytes", () => {
    const root = tempRoot();
    write(root, { "a.md": "bytes" });
    expect(hashFile(root, path.join(root, "a.md"))).toBe(sha("bytes"));
  });

  test("hashNormalized ignores key order but not values", () => {
    const value = { b: [{ y: 1, x: null }], a: "s" };
    expect(hashNormalized(value)).toBe(
      sha(JSON.stringify({ a: "s", b: [{ x: null, y: 1 }] })),
    );
    expect(hashNormalized({ a: "s", b: [{ x: null, y: 1 }] })).toBe(
      hashNormalized(value),
    );
    expect(hashNormalized([3, "x", true])).toBe(
      sha(JSON.stringify([3, "x", true])),
    );
    expect(hashNormalized(7)).toBe(sha("7"));
    expect(hashNormalized({ B: 1, a: 2 })).toBe(
      sha(JSON.stringify({ a: 2, B: 1 })),
    );
  });
});

describe("hashManifestWithCoordinates", () => {
  type Source = { path: string; state: string; sha256?: string };
  const expected = (
    manifest: string,
    coordinates: { state: string; sha256: string },
    referencedSources: Source[],
  ) =>
    sha(
      JSON.stringify({
        manifest: sha(manifest),
        coordinates,
        referencedSources,
      }),
    );

  test("covers the coordinate artifact state", () => {
    const root = tempRoot();
    const manifest = "symbols: []\n";
    write(root, { "m.yaml": manifest, "empty.yaml": "", "full.yaml": "c" });
    const m = path.join(root, "m.yaml");
    const missing = { state: "missing", sha256: "" };
    expect(hashManifestWithCoordinates(root, m, null)).toBe(
      expected(manifest, missing, []),
    );
    expect(
      hashManifestWithCoordinates(root, m, path.join(root, "none.yaml")),
    ).toBe(expected(manifest, missing, []));
    expect(
      hashManifestWithCoordinates(root, m, path.join(root, "empty.yaml")),
    ).toBe(expected(manifest, { state: "empty", sha256: sha("") }, []));
    expect(
      hashManifestWithCoordinates(root, m, path.join(root, "full.yaml")),
    ).toBe(expected(manifest, { state: "present", sha256: sha("c") }, []));
  });

  test("covers every referenced source once, in order", () => {
    const root = tempRoot();
    const manifest = [
      "symbols:",
      "  - sourceFile: src/b.ts",
      "  - source: src/a.ts",
      "  - sourceFile: src/b.ts",
      "  - sourceFile: 5",
      "    source: src/c.ts",
      "  - sourceFile: ''",
      "  - source: ''",
      "  - null",
      "  - plain",
      "  - [src/d.ts]",
      "  - sourceFile: ../out.ts",
      "  - sourceFile: ..",
      "  - sourceFile: /elsewhere/x.ts",
      "  - sourceFile: ..inside.ts",
      "  - sourceFile: dir",
      "",
    ].join("\n");
    write(root, {
      "m.yaml": manifest,
      "src/a.ts": "A",
      "src/b.ts": "B",
      "..inside.ts": "I",
    });
    mkdirSync(path.join(root, "dir"));
    expect(
      hashManifestWithCoordinates(root, path.join(root, "m.yaml"), null),
    ).toBe(
      expected(manifest, { state: "missing", sha256: "" }, [
        { path: "..", state: "outside-workspace" },
        { path: "../out.ts", state: "outside-workspace" },
        { path: "..inside.ts", state: "present", sha256: sha("I") },
        { path: "/elsewhere/x.ts", state: "outside-workspace" },
        { path: "dir", state: "unreadable" },
        { path: "src/a.ts", state: "present", sha256: sha("A") },
        { path: "src/b.ts", state: "present", sha256: sha("B") },
        { path: "src/c.ts", state: "missing" },
      ]),
    );
  });

  test("still fingerprints a manifest without symbols", () => {
    const root = tempRoot();
    for (const manifest of [
      "",
      "null\n",
      "- a\n",
      "symbols: 5\n",
      "key: [\n",
    ]) {
      write(root, { "m.yaml": manifest });
      expect(
        hashManifestWithCoordinates(root, path.join(root, "m.yaml"), null),
      ).toBe(expected(manifest, { state: "missing", sha256: "" }, []));
    }
  });

  test("an absolute source inside the workspace is read", () => {
    const root = tempRoot();
    const inside = path.join(root, "src", "a.ts");
    const manifest = `symbols:\n  - sourceFile: ${inside}\n`;
    write(root, { "m.yaml": manifest, "src/a.ts": "A" });
    expect(
      hashManifestWithCoordinates(`${root}/`, path.join(root, "m.yaml"), null),
    ).toBe(
      expected(manifest, { state: "missing", sha256: "" }, [
        { path: inside, state: "present", sha256: sha("A") },
      ]),
    );
  });
});

describe("cache files", () => {
  test("reads an empty cache when missing, broken or stale", () => {
    const root = tempRoot();
    const file = path.join(root, "sync-cache.json");
    expect(readSyncCache(file)).toStrictEqual(EMPTY);
    for (const content of [
      "{",
      "null",
      JSON.stringify({ version: 1, hashes: { a: "1" } }),
      JSON.stringify({ hashes: { a: "1" } }),
    ]) {
      writeFileSync(file, content);
      expect(readSyncCache(file)).toStrictEqual(EMPTY);
    }
    writeFileSync(
      file,
      JSON.stringify({
        version: 2,
        hashes: { a: "1" },
        compilerFingerprint: "x",
      }),
    );
    expect(
      readSyncCache(file, undefined, { compilerFingerprint: "y" }),
    ).toStrictEqual(EMPTY);
    writeFileSync(file, JSON.stringify({ version: 2, hashes: { a: "1" } }));
    expect(
      readSyncCache(file, undefined, { compilerFingerprint: "y" }),
    ).toStrictEqual(EMPTY);
  });

  test("keeps exactly the recorded fields", () => {
    const root = tempRoot();
    const file = path.join(root, "sync-cache.json");
    writeFileSync(file, JSON.stringify({ version: 2 }));
    expect(readSyncCache(file)).toStrictEqual(EMPTY);
    const full = {
      version: 2,
      hashes: { a: "1" },
      seenAt: { a: "t" },
      semanticHashes: { a: "s" },
      semanticContracts: { a: true },
      relationshipHashes: { r: "1" },
      entityHashes: { E: "1" },
      sourceEntityIds: { a: ["E"] },
      shardRelationships: { r: ["k"] },
      compilerFingerprint: "x",
      extractionFailures: { a: { hash: "h", message: "m" } },
      unknown: 1,
    };
    writeFileSync(file, JSON.stringify(full));
    const { unknown: _unknown, ...kept } = full;
    expect(readSyncCache(file)).toStrictEqual(kept);
    expect(
      readSyncCache(file, undefined, { compilerFingerprint: "x" }),
    ).toStrictEqual(kept);
    for (const field of [
      "relationshipHashes",
      "entityHashes",
      "sourceEntityIds",
      "shardRelationships",
      "compilerFingerprint",
      "extractionFailures",
    ]) {
      const {
        [field]: _dropped,
        unknown: _u,
        ...rest
      } = full as Record<string, unknown>;
      writeFileSync(file, JSON.stringify(rest));
      expect(readSyncCache(file)).toStrictEqual(rest as never);
    }
  });

  test("writes, creates the directory and copies the cache", () => {
    const root = tempRoot();
    const live = path.join(root, "live");
    const file = path.join(live, "sync-cache.json");
    writeSyncCache(file, EMPTY);
    expect(readFileSync(file).toString()).toBe(
      `${JSON.stringify(EMPTY, null, 2)}\n`,
    );
    writeSyncCache(file, { ...EMPTY, hashes: { a: "1" } });
    expect(readSyncCache(file).hashes).toStrictEqual({ a: "1" });
    const staging = path.join(root, "staging");
    mkdirSync(staging);
    copySyncCache(live, staging);
    expect(readFileSync(path.join(staging, "sync-cache.json")).toString()).toBe(
      readFileSync(file).toString(),
    );
    const empty = path.join(root, "empty");
    mkdirSync(empty);
    const other = path.join(root, "other");
    mkdirSync(other);
    copySyncCache(empty, other);
    expect(existsSync(path.join(other, "sync-cache.json"))).toBe(false);
  });
});

describe("injected file access", () => {
  function fakeFs(files: Record<string, string>) {
    const calls: unknown[][] = [];
    const deps = {
      existsSync: (p: unknown) => {
        if (p === null) throw new Error("null path");
        calls.push(["exists", p]);
        return Object.hasOwn(files, String(p));
      },
      readFileSync: ((p: string, ...rest: unknown[]) => {
        calls.push(["read", p, ...rest]);
        if (!Object.hasOwn(files, p)) throw new Error(`ENOENT ${p}`);
        return rest.length > 0
          ? (files[p] as string)
          : Buffer.from(files[p] as string);
      }) as never,
      writeFileSync: ((p: string, data: unknown, ...rest: unknown[]) => {
        calls.push(["write", p, data, ...rest]);
        files[p] = String(data);
      }) as never,
      mkdirSync: ((p: string, options: unknown) => {
        calls.push(["mkdir", p, options]);
      }) as never,
    };
    return { deps, calls, files };
  }

  test("a missing cache file is never read", () => {
    const fs = fakeFs({});
    const deps = {
      ...fs.deps,
      readFileSync: (() =>
        JSON.stringify({ version: 2, hashes: { a: "1" } })) as never,
    };
    expect(readSyncCache("/c.json", deps)).toStrictEqual(EMPTY);
  });

  test("reads and writes cache text as UTF-8", () => {
    const fs = fakeFs({ "/c.json": JSON.stringify({ version: 2 }) });
    readSyncCache("/c.json", fs.deps);
    expect(fs.calls).toContainEqual(["read", "/c.json", "utf8"]);
    fs.calls.length = 0;
    writeSyncCache("/d/c.json", EMPTY, fs.deps);
    expect(fs.calls).toStrictEqual([
      ["exists", "/d"],
      ["mkdir", "/d", { recursive: true }],
      ["write", "/d/c.json", `${JSON.stringify(EMPTY, null, 2)}\n`, "utf8"],
    ]);
    fs.calls.length = 0;
    fs.files["/d"] = "";
    writeSyncCache("/d/c.json", EMPTY, fs.deps);
    expect(fs.calls.map(([op]) => op)).toStrictEqual(["exists", "write"]);
    fs.calls.length = 0;
    copySyncCache("/d", "/s", fs.deps);
    expect(fs.calls).toStrictEqual([["exists", "/d/sync-cache.json"]]);
    fs.files["/d/sync-cache.json"] = "{}";
    fs.calls.length = 0;
    copySyncCache("/d", "/s", fs.deps);
    expect(fs.calls).toStrictEqual([
      ["exists", "/d/sync-cache.json"],
      ["read", "/d/sync-cache.json", "utf8"],
      ["write", "/s/sync-cache.json", "{}", "utf8"],
    ]);
  });

  test("a manifest without coordinates never asks for them", () => {
    const fs = fakeFs({ "/w/m.yaml": "symbols: []\n" });
    expect(
      hashManifestWithCoordinates("/w", "/w/m.yaml", null, fs.deps),
    ).toMatch(/^[a-f0-9]{64}$/);
  });

  test("writes a cache into nested new directories", () => {
    const root = tempRoot();
    const file = path.join(root, "a", "b", "sync-cache.json");
    writeSyncCache(file, EMPTY);
    expect(readSyncCache(file)).toStrictEqual(EMPTY);
  });
});
