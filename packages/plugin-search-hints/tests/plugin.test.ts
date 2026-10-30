import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { validateKibiPlugin, validateSearchHintsResult } from "kibi-plugin-sdk";

import {
  VectorCache,
  kibiPlugin,
  loadStaticModel,
  rankByMeaning,
} from "../src/index.js";

// float32 vectors computed from the upstream table with the reference
// tokenizer; the bundled table is int8, so they agree to a cosine near 1.
const reference = JSON.parse(
  readFileSync(
    new URL("./fixtures/reference-vectors.json", import.meta.url),
    "utf8",
  ),
) as { text: string; vector: number[] }[];

const model = loadStaticModel();

function cosine(left: ArrayLike<number>, right: ArrayLike<number>): number {
  let sum = 0;
  for (let index = 0; index < left.length; index++)
    sum += (left[index] ?? 0) * (right[index] ?? 0);
  return sum;
}

function entity(id: string, text: string, type = "req") {
  return { id, type, title: text.split("\n")[0] ?? text, text, hash: text };
}

const entities = [
  entity(
    "REQ-units",
    "Property values are compared in canonical units\nDurations such as minutes and seconds are converted before comparison.",
  ),
  entity(
    "REQ-gc",
    "Garbage collection and branch store maintenance\nkibi gc removes stale branch stores.",
  ),
  entity(
    "REQ-ids",
    "Entity id style\nNew entity ids use a type prefix and kebab-case words.",
  ),
];

function tempDir(): string {
  return mkdtempSync(path.join(tmpdir(), "kibi-search-hints-"));
}

// executable_for TEST-kibi-plugin-search-hints
describe("kibi-plugin-search-hints", () => {
  test("exports a valid offline search-hints plugin", () => {
    const plugin = validateKibiPlugin(kibiPlugin);
    expect(plugin.permissions).toEqual({
      network: false,
      metered: false,
      secrets: [],
    });
    expect(plugin.capabilities.searchHints?.model).toContain(
      "minishlab/potion-base-8M",
    );
  });

  test("vectors match the float32 reference model", () => {
    for (const { text, vector } of reference) {
      const encoded = model.encode(text);
      if (vector.every((value) => value === 0)) {
        expect(Array.from(encoded).every((value) => value === 0)).toBe(true);
        continue;
      }
      expect(cosine(encoded, vector)).toBeGreaterThan(0.999);
    }
  });

  test("a text has one vector, alone or among others", () => {
    const alone = model.encode(entities[0]?.text ?? "");
    const again = model.encode(entities[0]?.text ?? "");
    expect(Array.from(again)).toEqual(Array.from(alone));
  });

  test("ranks by meaning, deterministically, within the limit", () => {
    const directory = tempDir();
    try {
      const cache = VectorCache.open(directory, model.id, model.dims);
      const input = {
        query:
          "is half an hour equal to thirty minutes when values are compared?",
        limit: 2,
        entities,
        cacheDirectory: directory,
      };
      const hints = rankByMeaning(model, cache, input);
      expect(hints[0]?.id).toBe("REQ-units");
      expect(hints.length).toBeGreaterThan(0);
      expect(hints.length).toBeLessThanOrEqual(2);
      expect(
        validateSearchHintsResult(
          { hints },
          entities.map((e) => e.id),
          2,
        ).hints,
      ).toEqual(hints);
      expect(rankByMeaning(model, cache, input)).toEqual(hints);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("the cache reuses unchanged vectors and rebuilds changed, foreign or damaged ones", () => {
    const directory = tempDir();
    try {
      let encoded = 0;
      const counting = (text: string) => {
        encoded++;
        return model.encode(text);
      };
      const first = VectorCache.open(directory, model.id, model.dims);
      first.vectorsFor(entities, counting);
      first.save();
      expect(encoded).toBe(3);

      const reopened = VectorCache.open(directory, model.id, model.dims);
      const changed = [
        ...entities.slice(0, 2),
        { ...entity("REQ-ids", "Entity id style, revised") },
      ];
      reopened.vectorsFor(changed, counting);
      expect(encoded).toBe(4);
      reopened.save();

      const otherModel = VectorCache.open(directory, "other-model", model.dims);
      otherModel.vectorsFor(entities, counting);
      expect(encoded).toBe(7);

      writeFileSync(path.join(directory, "vectors.bin"), "KSHC garbage");
      const damaged = VectorCache.open(directory, model.id, model.dims);
      damaged.vectorsFor(entities, counting);
      expect(encoded).toBe(10);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("the plugin answers hint() through its cache directory", async () => {
    const directory = tempDir();
    try {
      const capability = kibiPlugin.capabilities.searchHints;
      const result = await capability.hint({
        query: "which branch stores may kibi gc delete?",
        limit: 1,
        entities,
        cacheDirectory: directory,
      });
      expect(result.hints.map((hint) => hint.id)).toEqual(["REQ-gc"]);
      expect(
        readFileSync(path.join(directory, "vectors.bin")).length,
      ).toBeGreaterThan(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
