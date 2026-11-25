import { describe, expect, test } from "bun:test";
import {
  CANONICAL_ENTITY_PATHS,
  DERIVED_KB_PREFIXES,
  ENTITY_LANES,
  KB_PATHS,
  KB_ROOT,
  LEGACY_CONFIG_PATH_KEYS,
  LEGACY_DEFAULT_ENTITY_PATHS,
  entityLaneForPath,
  isDerivedKbPath,
  isEntityLanePath,
  isFirmEditReceiptPath,
  isKbKnowledgePath,
  isSymbolsManifestPath,
  isSyncableKbSourcePath,
} from "../../src/utils/kb-paths.js";

describe("kb-paths constants", () => {
  test("name the canonical layout exactly", () => {
    expect(KB_ROOT).toBe(".kb");
    expect([...ENTITY_LANES]).toStrictEqual([
      "requirements",
      "scenarios",
      "tests",
      "facts",
      "adr",
      "flags",
      "events",
    ]);
    expect(LEGACY_CONFIG_PATH_KEYS).toStrictEqual({
      requirements: "requirements",
      scenarios: "scenarios",
      tests: "tests",
      facts: "facts",
      adr: "adr",
      flags: "flags",
      events: "events",
    });
    expect(KB_PATHS).toStrictEqual({
      lanes: {
        requirements: ".kb/requirements",
        scenarios: ".kb/scenarios",
        tests: ".kb/tests",
        facts: ".kb/facts",
        adr: ".kb/adr",
        flags: ".kb/flags",
        events: ".kb/events",
      },
      symbolsManifest: ".kb/symbols.yaml",
      symbolCoordinates: ".kb/symbol-coordinates.yaml",
      manifest: ".kb/manifest.json",
      relationships: ".kb/relationships",
      firmEditReviews: ".kb/firm-edit-reviews",
    });
    expect([...DERIVED_KB_PREFIXES]).toStrictEqual([
      ".kb/branches",
      ".kb/recovery",
      ".kb/proof/runs",
      ".kb/briefs",
      ".kb/migrations",
    ]);
    expect(CANONICAL_ENTITY_PATHS).toStrictEqual({
      requirements: ".kb/requirements",
      scenarios: ".kb/scenarios",
      tests: ".kb/tests",
      adr: ".kb/adr",
      flags: ".kb/flags",
      events: ".kb/events",
      facts: ".kb/facts",
      symbols: ".kb/symbols.yaml",
    });
    expect(LEGACY_DEFAULT_ENTITY_PATHS).toStrictEqual({
      requirements: "documentation/requirements",
      scenarios: "documentation/scenarios",
      tests: "documentation/tests",
      adr: "documentation/adr",
      flags: "documentation/flags",
      events: "documentation/events",
      facts: "documentation/facts",
      symbols: "documentation/symbols.yaml",
    });
  });
});

describe("kb-paths predicates", () => {
  test("an entity lane path is .kb/<lane>/...", () => {
    for (const lane of ENTITY_LANES) {
      expect(isEntityLanePath(`.kb/${lane}/A.md`)).toBe(true);
    }
    expect(isEntityLanePath(".kb/requirements")).toBe(true);
    expect(isEntityLanePath("xkb/requirements/A.md")).toBe(false);
    expect(isEntityLanePath(".kb/requirementsx/A.md")).toBe(false);
    expect(isEntityLanePath(".kb/branches/A.md")).toBe(false);
  });

  test("the lane of a path is found by its /<lane>/ segment", () => {
    for (const lane of ENTITY_LANES) {
      expect(entityLaneForPath(`docs/${lane}/A.md`)).toBe(lane);
    }
    expect(entityLaneForPath("docs/requirements.md")).toBeNull();
  });

  test("symbols manifests and knowledge paths", () => {
    expect(isSymbolsManifestPath(".kb/symbols.yaml")).toBe(true);
    expect(isSymbolsManifestPath(".kb/symbol-coordinates.yaml")).toBe(true);
    expect(isSymbolsManifestPath(".kb/other.yaml")).toBe(false);
    expect(isKbKnowledgePath(".kb/adr/A.md")).toBe(true);
    expect(isKbKnowledgePath(".kb/symbols.yaml")).toBe(true);
    expect(isKbKnowledgePath(".kb/manifest.json")).toBe(false);
  });

  test("syncable sources are lane documents, the symbols manifest and relationship shards", () => {
    expect(isSyncableKbSourcePath(".kb/requirements/REQ-1.md")).toBe(true);
    expect(isSyncableKbSourcePath(".kb/requirements/README.md")).toBe(false);
    expect(isSyncableKbSourcePath(".kb/requirements/REQ-1.txt")).toBe(false);
    expect(isSyncableKbSourcePath(KB_PATHS.symbolsManifest)).toBe(true);
    expect(isSyncableKbSourcePath(`${KB_PATHS.relationships}/a.yaml`)).toBe(
      true,
    );
    expect(isSyncableKbSourcePath(`${KB_PATHS.relationships}/a.yml`)).toBe(
      true,
    );
    expect(isSyncableKbSourcePath(`${KB_PATHS.relationships}/a.json`)).toBe(
      false,
    );
    expect(isSyncableKbSourcePath("docs/a.yaml")).toBe(false);
  });

  test("derived paths are each prefix itself or below it, with either separator", () => {
    for (const prefix of DERIVED_KB_PREFIXES) {
      expect(isDerivedKbPath(prefix)).toBe(true);
      expect(isDerivedKbPath(`${prefix}/x`)).toBe(true);
      expect(isDerivedKbPath(`${prefix}x`)).toBe(false);
    }
    expect(isDerivedKbPath(".kb\\branches\\x")).toBe(true);
    expect(isDerivedKbPath(".kb/requirements/x")).toBe(false);
  });
});

describe("isFirmEditReceiptPath", () => {
  test("accepts a JSON receipt under .kb/firm-edit-reviews in either separator", () => {
    expect(
      isFirmEditReceiptPath(".kb/firm-edit-reviews/REQ-a/src__a.ts--run.json"),
    ).toBe(true);
    expect(
      isFirmEditReceiptPath(
        ".kb\\firm-edit-reviews\\REQ-a\\src__a.ts--run.json",
      ),
    ).toBe(true);
  });

  test("rejects other files, other folders and a lookalike prefix", () => {
    expect(isFirmEditReceiptPath(".kb/firm-edit-reviews/REQ-a/notes.md")).toBe(
      false,
    );
    expect(isFirmEditReceiptPath(".kb/firm-edit-reviews")).toBe(false);
    expect(isFirmEditReceiptPath(".kb/firm-edit-reviews-old/a.json")).toBe(
      false,
    );
    expect(isFirmEditReceiptPath("src/.kb/firm-edit-reviews/a.json")).toBe(
      false,
    );
  });
});
