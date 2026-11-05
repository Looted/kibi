import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HostSourceAnalysisResultV2 } from "../../../src/plugins/source-analysis-service.js";
import {
  SOURCE_ANALYSIS_CACHE_FILE,
  openSourceAnalysisCache,
  setBuiltinManifestResolverForTests,
} from "../../../src/public/operations/source-analysis-cache.js";

const roots: string[] = [];
afterEach(() => {
  setBuiltinManifestResolverForTests();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(): { root: string; store: string } {
  const root = mkdtempSync(join(tmpdir(), "kibi-analysis-cache-"));
  roots.push(root);
  const store = join(root, ".kb", "branches", "main");
  mkdirSync(store, { recursive: true });
  return { root, store };
}

const analysis = (marker: string) =>
  ({
    status: "ok",
    symbols: [{ name: marker }],
  }) as unknown as HostSourceAnalysisResultV2;

const names = (store: string) =>
  Object.values(
    JSON.parse(readFileSync(join(store, SOURCE_ANALYSIS_CACHE_FILE), "utf8"))
      .entries as Record<string, { symbols: { name: string }[] }>,
  ).map((entry) => entry.symbols[0]?.name);

describe("openSourceAnalysisCache", () => {
  test("a replaced entry is written even when no entry was dropped", () => {
    const { root, store } = workspace();
    const first = openSourceAnalysisCache(store, root);
    first?.set("a.ts", "a", analysis("old"));
    first?.save();
    const second = openSourceAnalysisCache(store, root);
    second?.set("a.ts", "a", analysis("new"));
    second?.save();
    expect(names(store)).toEqual(["new"]);
  });

  test("an unavailable builtin analyzer is another analyzer set", () => {
    const { root, store } = workspace();
    const first = openSourceAnalysisCache(store, root);
    first?.set("a.ts", "a", analysis("built"));
    first?.save();
    setBuiltinManifestResolverForTests(() => {
      throw new Error("no builtin package");
    });
    const missing = openSourceAnalysisCache(store, root);
    expect(missing).not.toBeNull();
    expect(missing?.get("a.ts", "a")).toBeUndefined();
    setBuiltinManifestResolverForTests();
    expect(openSourceAnalysisCache(store, root)?.get("a.ts", "a")).toEqual(
      analysis("built"),
    );
  });
});
