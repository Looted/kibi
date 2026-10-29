/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { HostSourceAnalysisResultV2 } from "../../../src/plugins/source-analysis-service.js";
import {
  SOURCE_ANALYSIS_CACHE_FILE,
  openSourceAnalysisCache,
} from "../../../src/public/operations/source-analysis-cache.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function workspace(): { root: string; store: string } {
  const root = mkdtempSync(join(tmpdir(), "kibi-analysis-cache-"));
  roots.push(root);
  const store = join(root, ".kb", "branches", "main");
  mkdirSync(store, { recursive: true });
  return { root, store };
}

function analysis(marker: string, status = "ok"): HostSourceAnalysisResultV2 {
  return {
    status,
    symbols: [{ name: marker }],
  } as unknown as HostSourceAnalysisResultV2;
}

type CacheFile = {
  version: number;
  analyzers: string;
  entries: Record<string, { status: string; symbols: { name: string }[] }>;
};

const cachePath = (store: string) => join(store, SOURCE_ANALYSIS_CACHE_FILE);
const readCache = (store: string): CacheFile =>
  JSON.parse(readFileSync(cachePath(store), "utf8"));

/** A cache file holding one `ok` entry for `a.ts` with `content`. */
function seed(root: string, store: string, content = "export {}\n") {
  const cache = openSourceAnalysisCache(store, root);
  cache?.set("a.ts", content, analysis("seeded"));
  cache?.save();
  return readCache(store);
}

describe("source analysis cache", () => {
  test("is unavailable when the branch store does not exist", () => {
    const { root } = workspace();
    expect(openSourceAnalysisCache(join(root, "missing"), root)).toBeNull();
  });

  test("an entry is found only for the same path and the same bytes", () => {
    const { root, store } = workspace();
    seed(root, store);
    const cache = openSourceAnalysisCache(store, root);
    expect(cache?.get("a.ts", "export {}\n")?.symbols).toEqual([
      { name: "seeded" },
    ] as never);
    expect(cache?.get("b.ts", "export {}\n")).toBeUndefined();
    expect(cache?.get("a.ts", "export {};\n")).toBeUndefined();
  });

  test("a path and its bytes are kept apart in the entry key", () => {
    const { root, store } = workspace();
    const cache = openSourceAnalysisCache(store, root);
    cache?.set("a", "bc", analysis("split"));
    cache?.save();
    const keys = Object.keys(readCache(store).entries);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[a-f0-9]{64}$/);
    const reopened = openSourceAnalysisCache(store, root);
    expect(reopened?.get("ab", "c")).toBeUndefined();
    expect(reopened?.get("a", "bc")).toBeDefined();
  });

  test("a rebuilt builtin analyzer starts a fresh cache", () => {
    const { root, store } = workspace();
    seed(root, store);
    const symbolsDir = join(
      dirname(
        createRequire(import.meta.url).resolve(
          "kibi-plugin-builtin/package.json",
        ),
      ),
      "dist",
      "symbols",
    );
    const built = readdirSync(symbolsDir).sort()[0] as string;
    const builtPath = join(symbolsDir, built);
    const before = statSync(builtPath);
    try {
      utimesSync(builtPath, before.atime, new Date(before.mtimeMs + 60_000));
      expect(
        openSourceAnalysisCache(store, root)?.get("a.ts", "export {}\n"),
      ).toBeUndefined();
      // The fresh cache serves entries saved under the new analyzer.
      seed(root, store);
      expect(
        openSourceAnalysisCache(store, root)?.get("a.ts", "export {}\n"),
      ).toBeDefined();
    } finally {
      // Restoring through a Date loses sub-millisecond precision, so the
      // original signature is not asserted after this.
      utimesSync(builtPath, before.atime, before.mtime);
    }
  });

  test("an analysis that is not ok is neither stored nor served", () => {
    const { root, store } = workspace();
    const cache = openSourceAnalysisCache(store, root);
    cache?.set("a.ts", "x", analysis("failed", "failed"));
    cache?.save();
    expect(existsSync(cachePath(store))).toBe(false);

    const file = seed(root, store, "x");
    const key = Object.keys(file.entries)[0] as string;
    (file.entries[key] as { status: string }).status = "failed";
    writeFileSync(cachePath(store), JSON.stringify(file));
    expect(openSourceAnalysisCache(store, root)?.get("a.ts", "x")).toBe(
      undefined,
    );
  });

  test("saving keeps only the entries this run used", () => {
    const { root, store } = workspace();
    const first = openSourceAnalysisCache(store, root);
    first?.set("a.ts", "a", analysis("a"));
    first?.set("b.ts", "b", analysis("b"));
    first?.save();
    expect(Object.keys(readCache(store).entries)).toHaveLength(2);

    const second = openSourceAnalysisCache(store, root);
    expect(second?.get("a.ts", "a")).toBeDefined();
    second?.save();
    const kept = readCache(store);
    expect(Object.values(kept.entries).map((e) => e.symbols[0]?.name)).toEqual([
      "a",
    ]);
  });

  test("a run that only read every entry leaves the file untouched", () => {
    const { root, store } = workspace();
    const file = seed(root, store);
    // Reformatted bytes would be lost by any rewrite.
    const pretty = JSON.stringify(file, null, 2);
    writeFileSync(cachePath(store), pretty);
    const cache = openSourceAnalysisCache(store, root);
    expect(cache?.get("a.ts", "export {}\n")).toBeDefined();
    cache?.save();
    expect(readFileSync(cachePath(store), "utf8")).toBe(pretty);
  });

  test("a run that adds an entry rewrites the file even when nothing was dropped", () => {
    const { root, store } = workspace();
    seed(root, store);
    const cache = openSourceAnalysisCache(store, root);
    expect(cache?.get("a.ts", "export {}\n")).toBeDefined();
    cache?.set("b.ts", "b", analysis("b"));
    cache?.save();
    expect(Object.keys(readCache(store).entries)).toHaveLength(2);
  });

  test.each([
    ["another cache version", (file: CacheFile) => ({ ...file, version: 0 })],
    [
      "another analyzer set",
      (file: CacheFile) => ({ ...file, analyzers: "older-analyzers" }),
    ],
    [
      "entries that are null",
      (file: CacheFile) => ({ ...file, entries: null }),
    ],
    [
      "entries that are not an object",
      (file: CacheFile) => ({ ...file, entries: "entries" }),
    ],
  ])("a file with %s is ignored", (_label, change) => {
    const { root, store } = workspace();
    const file = seed(root, store);
    writeFileSync(cachePath(store), JSON.stringify(change(file)));
    const cache = openSourceAnalysisCache(store, root);
    expect(cache?.get("a.ts", "export {}\n")).toBeUndefined();
    // The next save starts a fresh file for the current analyzer set.
    cache?.set("a.ts", "export {}\n", analysis("fresh"));
    cache?.save();
    const rewritten = readCache(store);
    expect(rewritten.version).toBe(file.version);
    expect(rewritten.analyzers).toBe(file.analyzers);
  });

  test("a file whose entries are not an object is replaced only when there is something to keep", () => {
    const { root, store } = workspace();
    const file = seed(root, store);
    const broken = JSON.stringify({ ...file, entries: "entries" });
    writeFileSync(cachePath(store), broken);
    openSourceAnalysisCache(store, root)?.save();
    expect(readFileSync(cachePath(store), "utf8")).toBe(broken);
  });

  test("a store removed before saving costs only the cache", () => {
    const { root, store } = workspace();
    const cache = openSourceAnalysisCache(store, root);
    cache?.set("a.ts", "a", analysis("a"));
    rmSync(store, { recursive: true, force: true });
    expect(() => cache?.save()).not.toThrow();
    expect(existsSync(store)).toBe(false);
  });

  test("a file that is not JSON is ignored", () => {
    const { root, store } = workspace();
    writeFileSync(cachePath(store), "{ not json");
    const cache = openSourceAnalysisCache(store, root);
    expect(cache?.get("a.ts", "x")).toBeUndefined();
  });

  test("a project source-analyzer plugin changes the analyzer set", () => {
    const { root, store } = workspace();
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "p" }));
    const before = seed(root, store);
    expect(before.analyzers).toMatch(/^[a-f0-9]{64}$/);

    // An analyzer Kibi cannot fingerprint means nothing is cached at all.
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "p",
        kibi: {
          plugins: [
            {
              package: "kibi-plugin-unapproved",
              capabilities: {
                "kibi.symbol-extractor.v2": { mode: "augment" },
              },
            },
          ],
        },
      }),
    );
    expect(openSourceAnalysisCache(store, root)).toBeNull();

    // A plugin with no source-analysis capability keeps the same set.
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "p",
        kibi: {
          plugins: [
            {
              package: "uninstalled-classifier",
              capabilities: {
                "kibi.semantic-classifier.v1": { mode: "replace" },
              },
            },
          ],
        },
      }),
    );
    expect(
      openSourceAnalysisCache(store, root)?.get("a.ts", "export {}\n"),
    ).toBeDefined();
  });

  test("a failed write leaves no temporary file and does not throw", () => {
    const { root, store } = workspace();
    // A directory in the cache file's place makes the final rename fail.
    mkdirSync(cachePath(store));
    const cache = openSourceAnalysisCache(store, root);
    cache?.set("a.ts", "a", analysis("a"));
    expect(() => cache?.save()).not.toThrow();
    expect(readdirSync(store).filter((name) => name.endsWith(".tmp"))).toEqual(
      [],
    );
  });

  test("checks saving at the same time never leave a torn file", async () => {
    const { root, store } = workspace();
    const modulePath = resolve(
      import.meta.dir,
      "../../../src/public/operations/source-analysis-cache.ts",
    );
    const writer = join(root, "writer.ts");
    // Each writer saves a large entry set many times, under its own pid.
    writeFileSync(
      writer,
      `import { openSourceAnalysisCache } from ${JSON.stringify(modulePath)};
const [store, root, tag] = process.argv.slice(2);
for (let round = 0; round < 40; round += 1) {
  const cache = openSourceAnalysisCache(store, root);
  for (let i = 0; i < 200; i += 1) {
    cache.set(tag + "/" + i + ".ts", String(round), {
      status: "ok",
      symbols: [{ name: tag.repeat(64) }],
    });
  }
  cache.save();
}
`,
    );
    const spawnWriter = (tag: string) =>
      Bun.spawn([process.execPath, writer, store, root, tag], {
        stdout: "ignore",
        stderr: "pipe",
      });
    const writers = [spawnWriter("left"), spawnWriter("right")];
    let reads = 0;
    const done = Promise.all(writers.map((child) => child.exited));
    let finished = false;
    done.then(() => {
      finished = true;
    });
    // Read while the writers run, and once more after they finish.
    while (!finished || reads === 0) {
      if (existsSync(cachePath(store))) {
        const text = readFileSync(cachePath(store), "utf8");
        const parsed = JSON.parse(text) as CacheFile;
        expect(Object.keys(parsed.entries)).toHaveLength(200);
        reads += 1;
      }
      await Bun.sleep(1);
    }
    expect(await done).toEqual([0, 0]);
    const final = readCache(store);
    const tags = new Set(
      Object.values(final.entries).map((e) => e.symbols[0]?.name.slice(0, 4)),
    );
    // One writer's complete set, never a mix.
    expect(tags.size).toBe(1);
    expect(readdirSync(store).filter((name) => name.endsWith(".tmp"))).toEqual(
      [],
    );
    expect(reads).toBeGreaterThan(0);
  }, 60_000);
});
