// implements REQ-cli-sync
import { describe, expect, test } from "bun:test";
import {
  entityLaneForPath,
  isDerivedKbPath,
  isEntityLanePath,
  isKbKnowledgePath,
  isSymbolsManifestPath,
} from "../../src/utils/kb-paths.js";
import {
  resolveSymbolsManifestPath,
  resolveSymbolsManifestPaths,
} from "../../src/utils/manifest-paths.js";

describe("kb path helpers", () => {
  test("classifies lanes, manifests, and derived runtime trees", () => {
    expect(isEntityLanePath("docs/req.md")).toBe(false);
    expect(isEntityLanePath(".kb/requirements/REQ-1.md")).toBe(true);
    expect(entityLaneForPath(".kb/requirements/REQ-1.md")).toBe("requirements");
    expect(entityLaneForPath("src/app.ts")).toBeNull();
    expect(isSymbolsManifestPath(".kb/symbols.yaml")).toBe(true);
    expect(isSymbolsManifestPath(".kb/symbol-coordinates.yaml")).toBe(true);
    expect(isSymbolsManifestPath(".kb/tests/TEST-1.md")).toBe(false);
    expect(isKbKnowledgePath(".kb/tests/TEST-1.md")).toBe(true);
    expect(isKbKnowledgePath("src/app.ts")).toBe(false);
    expect(isDerivedKbPath(".kb/branches/develop")).toBe(true);
    expect(isDerivedKbPath(".kb/recovery/journal.json")).toBe(true);
    expect(isDerivedKbPath(".kb\\recovery\\journal.json")).toBe(true);
    expect(isDerivedKbPath(".kb/requirements/REQ-1.md")).toBe(false);
  });

  test("resolves canonical symbol manifest paths", () => {
    expect(resolveSymbolsManifestPath("/repo")).toBe("/repo/.kb/symbols.yaml");
    expect(resolveSymbolsManifestPaths("/repo")).toEqual({
      symbolsPath: "/repo/.kb/symbols.yaml",
      coordinatesPath: "/repo/.kb/symbol-coordinates.yaml",
    });
  });
});
