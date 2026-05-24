import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const root = path.resolve(import.meta.dir);
const fixtureRoot = root;

const expectedFiles = [
  "authored-only.yaml",
  "conflict-state/symbol-coordinates.yaml",
  "conflict-state/symbols.yaml",
  "coordinate-artifact.yaml",
  "legacy-inline.yaml",
  "missing-coordinates/symbols.yaml",
  "split-state/symbol-coordinates.yaml",
  "split-state/symbols.yaml",
  "unknown-symbol/symbol-coordinates.yaml",
];

type YamlObject = Record<string, unknown>;

function listFiles(dir: string, prefix = ""): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) files.push(...listFiles(full, rel));
    else files.push(rel);
  }

  return files.sort();
}

function listYamlFiles(dir: string, prefix = ""): string[] {
  return listFiles(dir, prefix).filter((file) => file.endsWith(".yaml"));
}

function collectKeys(value: unknown, keys: string[] = []): string[] {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    keys.push(key);
    collectKeys(nested, keys);
  }
  return keys;
}

function loadYaml(relPath: string) {
  return yaml.load(readFileSync(path.join(fixtureRoot, relPath), "utf8"));
}

describe("symbol coordinate fixtures", () => {
  test("inventory matches expected list", () => {
    expect(listYamlFiles(fixtureRoot)).toEqual(expectedFiles);
  });

  test("all fixtures parse and omit coordinatesGeneratedAt", () => {
    for (const relPath of expectedFiles) {
      const doc = loadYaml(relPath);
      expect(doc).not.toBeNull();
      expect(collectKeys(doc)).not.toContain("coordinatesGeneratedAt");
    }
  });

  test("legacy inline fixture has embedded coordinates", () => {
    const doc = loadYaml("legacy-inline.yaml") as { symbols: YamlObject[] };
    expect(doc.symbols[0].sourceLine).toBe(10);
    expect(doc.symbols[0].sourceColumn).toBe(0);
  });

  test("authored-only fixture omits coordinate fields", () => {
    const doc = loadYaml("authored-only.yaml") as { symbols: YamlObject[] };
    expect(doc.symbols[0].sourceLine).toBeUndefined();
    expect(doc.symbols[0].sourceColumn).toBeUndefined();
  });

  test("split state separates authored symbols and coordinates", () => {
    const symbols = loadYaml("split-state/symbols.yaml") as {
      symbols: YamlObject[];
    };
    const coords = loadYaml("split-state/symbol-coordinates.yaml") as {
      coordinates: Record<string, YamlObject>;
    };
    expect(symbols.symbols[0].sourceLine).toBeUndefined();
    expect(coords.coordinates["SYM-001"].sourceLine).toBe(10);
  });

  test("conflict state keeps differing inline and artifact coordinates", () => {
    const symbols = loadYaml("conflict-state/symbols.yaml") as {
      symbols: YamlObject[];
    };
    const coords = loadYaml("conflict-state/symbol-coordinates.yaml") as {
      coordinates: Record<string, YamlObject>;
    };
    expect(symbols.symbols[0].sourceLine).toBe(1);
    expect(coords.coordinates["SYM-001"].sourceLine).toBe(10);
  });

  test("missing coordinates fixture has no artifact", () => {
    const files = listFiles(path.join(fixtureRoot, "missing-coordinates"));
    expect(files).toEqual(["symbols.yaml"]);
  });

  test("unknown-symbol artifact references missing symbol id", () => {
    const symbols = loadYaml("authored-only.yaml") as {
      symbols: Array<{ id?: string }>;
    };
    const coords = loadYaml("unknown-symbol/symbol-coordinates.yaml") as {
      coordinates: Record<string, YamlObject>;
    };
    expect(symbols.symbols.some((entry) => entry.id === "SYM-999")).toBe(
      false,
    );
    expect(coords.coordinates["SYM-999"].sourceFile).toBe("src/ghost.ts");
  });
});
