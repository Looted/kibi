// implements REQ-008
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractSymbolsFromStagedFile } from "../../src/traceability/symbol-extract.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

describe("extractSymbolsFromStagedFile leftover script, cache, and hunk branches", () => {
  test("parses implements lists and filters modified hunks", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const content = [
      "// implements REQ-ALPHA, REQ-BETA",
      "export function kept() {}",
      "",
      "export function skipped() {}",
      "",
    ].join("\n");
    const symbols = extractSymbolsFromStagedFile({
      path: "src/hunk-filter-remaining.ts",
      content,
      hunkRanges: [{ start: 1, end: 2 }],
      status: "M",
    });
    expect(symbols.map((symbol) => symbol.name)).toContain("kept");
    expect(symbols.some((symbol) => symbol.name === "skipped")).toBe(false);
    expect(symbols[0]?.reqLinks).toEqual(
      expect.arrayContaining(["REQ-ALPHA", "REQ-BETA"]),
    );
  });

  test("reuses the TTL cache and returns no symbols after expiry recreates a parse failure", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const now = spyOn(Date, "now");
    restores.push(() => now.mockRestore());
    now.mockReturnValue(1_000);
    const first = extractSymbolsFromStagedFile({
      path: "src/cache.ts",
      content: "export function cached() {}",
      hunkRanges: [],
      status: "A",
    });
    expect(first.some((symbol) => symbol.name === "cached")).toBe(true);
    const second = extractSymbolsFromStagedFile({
      path: "src/cache.ts",
      content: "export function cached() {}",
      hunkRanges: [],
      status: "A",
    });
    expect(second.some((symbol) => symbol.name === "cached")).toBe(true);
    now.mockReturnValue(1_000 + 31_000);
    const expired = extractSymbolsFromStagedFile({
      path: "src/broken.ts",
      content: "export function (",
      hunkRanges: [{ start: 1, end: 2 }],
      status: "M",
    });
    expect(expired).toEqual([]);
  });

  test("analyzes jsx/js/mts files and anonymous exports", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const jsx = extractSymbolsFromStagedFile({
      path: "src/view.jsx",
      content: "export function View() { return null; }",
      hunkRanges: [],
      status: "A",
    });
    expect(jsx.some((symbol) => symbol.name === "View")).toBe(true);
    const js = extractSymbolsFromStagedFile({
      path: "src/legacy.js",
      content: "export function jsFn() {}",
      hunkRanges: [],
      status: "A",
    });
    expect(js.some((symbol) => symbol.name === "jsFn")).toBe(true);
    const mts = extractSymbolsFromStagedFile({
      path: "src/mod.mts",
      content: "export function mtsFn() {}",
      hunkRanges: [],
      status: "A",
    });
    expect(mts.some((symbol) => symbol.name === "mtsFn")).toBe(true);
    const anon = extractSymbolsFromStagedFile({
      path: "src/anon.ts",
      content: "export default function () {}",
      hunkRanges: [],
      status: "A",
    });
    expect(anon.some((symbol) => symbol.name === "<anonymous>")).toBe(true);
  });

  test("ignores a malformed on-disk manifest and hashes the symbol id", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-sym-bad-");
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "symbols.yaml"), "not: [yaml");
    const symbols = extractSymbolsFromStagedFile({
      path: path.join(root, "src", "mod.ts"),
      content: "export function diskFn() {}",
      hunkRanges: [],
      status: "A",
    });
    expect(symbols[0]?.id).toHaveLength(16);
  });
});
