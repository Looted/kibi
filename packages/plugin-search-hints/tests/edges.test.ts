import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  MODEL_LABEL,
  VectorCache,
  kibiPlugin,
  loadStaticModel,
  rankByMeaning,
} from "../src/index.js";

const model = loadStaticModel();
const scratch: string[] = [];
afterAll(() => {
  for (const directory of scratch)
    rmSync(directory, { recursive: true, force: true });
});

function tempDir(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "kibi-search-hints-"));
  scratch.push(directory);
  return directory;
}

function entity(id: string, text: string, type = "req") {
  return { id, type, title: text, text, hash: text };
}

/** A model asset with the given rows of int8 weights, one scale per row. */
function asset(
  rows: readonly (readonly number[])[],
  vocabulary: readonly string[],
  options: { magic?: string; version?: number } = {},
): string {
  const directory = tempDir();
  const dims = rows[0]?.length ?? 0;
  const table = Buffer.alloc(16 + rows.length * 4 + rows.length * dims);
  table.write(options.magic ?? "KSHM", 0, "ascii");
  table.writeUInt32LE(options.version ?? 1, 4);
  table.writeUInt32LE(rows.length, 8);
  table.writeUInt32LE(dims, 12);
  rows.forEach((row, index) => {
    table.writeFloatLE(0.5, 16 + index * 4);
    row.forEach((weight, col) =>
      table.writeInt8(weight, 16 + rows.length * 4 + index * dims + col),
    );
  });
  writeFileSync(path.join(directory, "potion-base-8M.int8.bin"), table);
  writeFileSync(
    path.join(directory, "vocab.txt"),
    `${vocabulary.join("\n")}\n`,
  );
  return directory;
}

const TINY_VOCABULARY = ["[PAD]", "[UNK]", "east", "west", "north"];
const TINY_ROWS = [
  [0, 0],
  [100, 0],
  [3, 4],
  [-3, -4],
  [0, 8],
];

function header(file: string): { entries: [string, string][] } {
  const bytes = readFileSync(file);
  return JSON.parse(bytes.toString("utf8", 12, 12 + bytes.readUInt32LE(8))) as {
    entries: [string, string][];
  };
}

// executable_for TEST-kibi-plugin-search-hints
describe("search hints model edges", () => {
  test("the model id names the label and the asset digest", () => {
    expect(MODEL_LABEL).toBe("minishlab/potion-base-8M@bf8b056651a2/int8");
    expect(model.id).toMatch(
      /^minishlab\/potion-base-8M@bf8b056651a2\/int8-[0-9a-f]{12}$/,
    );
    expect(model.dims).toBe(256);
  });

  test("vectors are unit length, and text with no known token is all zero", () => {
    const vector = model.encode("garbage collection of branch stores");
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
    expect(norm).toBeCloseTo(1, 5);
    // A lone unknown character is [UNK], which never contributes.
    expect(Array.from(model.encode("☃")).every((value) => value === 0)).toBe(
      true,
    );
    expect(Array.from(model.encode("")).every((value) => value === 0)).toBe(
      true,
    );
  });

  test("only the first 512 tokens count", () => {
    const head = "the ".repeat(512);
    expect(Array.from(model.encode(`${head}garbage collection`))).toEqual(
      Array.from(model.encode(head)),
    );
    expect(
      Array.from(model.encode(`${"the ".repeat(511)}garbage`)),
    ).not.toEqual(Array.from(model.encode(head)));
  });

  test("a tiny asset gives the exact normalised mean of its rows", () => {
    const tiny = loadStaticModel(asset(TINY_ROWS, TINY_VOCABULARY));
    expect(tiny.dims).toBe(2);
    expect(Array.from(tiny.encode("east"))).toEqual([
      Math.fround(0.6),
      Math.fround(0.8),
    ]);
    // east + north = (3, 12) before normalising.
    const [x, y] = Array.from(tiny.encode("east north"));
    expect(x).toBeCloseTo(3 / Math.sqrt(153), 6);
    expect(y).toBeCloseTo(12 / Math.sqrt(153), 6);
    // Opposite rows cancel to the zero vector; [UNK] never counts.
    expect(Array.from(tiny.encode("east west"))).toEqual([0, 0]);
    expect(Array.from(tiny.encode("east south"))).toEqual(
      Array.from(tiny.encode("east")),
    );
  });

  test("a foreign asset or a vocabulary that does not fit is refused", () => {
    expect(() =>
      loadStaticModel(asset(TINY_ROWS, TINY_VOCABULARY, { magic: "XXXX" })),
    ).toThrow("search hints model asset has an unknown format");
    expect(() =>
      loadStaticModel(asset(TINY_ROWS, TINY_VOCABULARY, { version: 2 })),
    ).toThrow("search hints model asset has an unknown format");
    expect(() =>
      loadStaticModel(asset(TINY_ROWS, [...TINY_VOCABULARY, "south"])),
    ).toThrow("search hints vocabulary has 6 tokens for 5 table rows");
  });
});

// executable_for TEST-kibi-plugin-search-hints
describe("search hints vector cache edges", () => {
  const vectors = new Map([
    ["REQ-b", Float32Array.from([0.25, -0.5])],
    ["REQ-a", Float32Array.from([1, 0.125])],
  ]);
  const rows = [entity("REQ-b", "b"), entity("REQ-a", "a")];
  const encode = (text: string) =>
    vectors.get(`REQ-${text}`) ?? Float32Array.from([0, 0]);
  const never = (): Float32Array => {
    throw new Error("cached vectors must not be recomputed");
  };

  function saved(directory: string): string {
    const cache = VectorCache.open(directory, "m", 2);
    cache.vectorsFor(rows, encode);
    cache.save();
    return path.join(directory, "vectors.bin");
  }

  test("a saved cache reads back every vector exactly, sorted by key", () => {
    const directory = tempDir();
    const file = saved(directory);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    expect(header(file).entries).toEqual([
      ["req::REQ-a", "a"],
      ["req::REQ-b", "b"],
    ]);
    const reopened = VectorCache.open(directory, "m", 2);
    expect(reopened.keys()).toEqual(["req::REQ-a", "req::REQ-b"]);
    expect(reopened.vectorsFor(rows, never).map((v) => Array.from(v))).toEqual([
      [0.25, -0.5],
      [1, 0.125],
    ]);
  });

  test("another magic, version, model, width or length rebuilds everything", () => {
    const damage: ((bytes: Buffer) => Buffer)[] = [
      (bytes) => Buffer.concat([Buffer.from("XXXX"), bytes.subarray(4)]),
      (bytes) => {
        const copy = Buffer.from(bytes);
        copy.writeUInt32LE(2, 4);
        return copy;
      },
      (bytes) => bytes.subarray(0, bytes.length - 1),
      (bytes) => {
        const copy = Buffer.from(bytes);
        copy.write("{", 12, "utf8");
        copy.write("!", 13, "utf8");
        return copy;
      },
    ];
    for (const change of damage) {
      const directory = tempDir();
      const file = saved(directory);
      writeFileSync(file, change(readFileSync(file)));
      expect(VectorCache.open(directory, "m", 2).keys()).toEqual([]);
    }
    const directory = tempDir();
    saved(directory);
    expect(VectorCache.open(directory, "other", 2).keys()).toEqual([]);
    expect(VectorCache.open(directory, "m", 3).keys()).toEqual([]);
    expect(VectorCache.open(tempDir(), "m", 2).keys()).toEqual([]);
  });

  test("entities of different types never share a vector", () => {
    const directory = tempDir();
    const cache = VectorCache.open(directory, "m", 2);
    cache.vectorsFor(
      [entity("X-1", "a"), entity("X-1", "b", "scenario")],
      encode,
    );
    expect(cache.keys()).toEqual(["req::X-1", "scenario::X-1"]);
  });

  test("retain drops entities that are gone, and only changes are written", () => {
    const directory = tempDir();
    const file = saved(directory);
    const cache = VectorCache.open(directory, "m", 2);
    cache.vectorsFor(rows, never);
    cache.retain(rows);
    rmSync(file);
    cache.save();
    // Nothing changed, so nothing was written.
    expect(() => statSync(file)).toThrow();
    cache.retain([rows[1] as (typeof rows)[number]]);
    cache.save();
    expect(header(file).entries).toEqual([["req::REQ-a", "a"]]);
    rmSync(file);
    cache.save();
    expect(() => statSync(file)).toThrow();
  });

  test("an unwritable cache directory only costs a rebuild", () => {
    const cache = VectorCache.open(
      path.join(tempDir(), "missing", "dir"),
      "m",
      2,
    );
    cache.vectorsFor(rows, encode);
    expect(() => cache.save()).not.toThrow();
  });
});

// executable_for TEST-kibi-plugin-search-hints
describe("search hints ranking edges", () => {
  const tiny = loadStaticModel(asset(TINY_ROWS, TINY_VOCABULARY));
  const input = (
    entities: ReturnType<typeof entity>[],
    query: string,
    limit = 20,
  ) => ({ query, limit, entities, cacheDirectory: tempDir() });

  function rank(
    entities: ReturnType<typeof entity>[],
    query: string,
    limit = 20,
  ) {
    const request = input(entities, query, limit);
    return rankByMeaning(
      tiny,
      VectorCache.open(request.cacheDirectory, tiny.id, tiny.dims),
      request,
    );
  }

  test("ties are ordered by id, and non-positive matches are left out", () => {
    expect(
      rank(
        [
          entity("REQ-c", "east"),
          entity("REQ-a", "east"),
          entity("REQ-west", "west"),
          entity("REQ-zero", "south"),
          entity("REQ-north", "north"),
        ],
        "east",
      ),
    ).toEqual([
      { id: "REQ-a", score: 1 },
      { id: "REQ-c", score: 1 },
      { id: "REQ-north", score: Math.fround(0.8) },
    ]);
  });

  test("the limit is clamped to 0..20", () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      entity(`REQ-${String(index).padStart(2, "0")}`, "east"),
    );
    expect(rank(many, "east", 30)).toHaveLength(20);
    expect(rank(many, "east", 1)).toEqual([{ id: "REQ-00", score: 1 }]);
    expect(rank(many, "east", -1)).toEqual([]);
  });

  test("the cache keeps only the entities of the latest request", () => {
    const request = input(
      [entity("REQ-a", "east"), entity("REQ-b", "north")],
      "east",
    );
    const cache = VectorCache.open(request.cacheDirectory, tiny.id, tiny.dims);
    rankByMeaning(tiny, cache, request);
    rankByMeaning(tiny, cache, {
      ...request,
      entities: [entity("REQ-b", "north")],
    });
    expect(
      header(path.join(request.cacheDirectory, "vectors.bin")).entries,
    ).toEqual([["req::REQ-b", "north"]]);
  });

  test("hint() keeps one cache per directory for the process", async () => {
    const directory = tempDir();
    const capability = kibiPlugin.capabilities.searchHints;
    const request = {
      query: "east",
      limit: 1,
      entities: [entity("REQ-a", "east")],
      cacheDirectory: directory,
    };
    await capability.hint(request);
    const file = path.join(directory, "vectors.bin");
    rmSync(file);
    await capability.hint(request);
    // The in-memory cache already holds the vector, so nothing is rewritten.
    expect(() => statSync(file)).toThrow();
  });
});
