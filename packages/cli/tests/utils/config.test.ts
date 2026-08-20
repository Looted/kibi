/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  legacyConfigExists,
  loadEntityPaths,
  readLegacyKbConfig,
  resolveLegacyEntityPaths,
} from "../../src/utils/config.js";
import {
  CANONICAL_ENTITY_PATHS,
  LEGACY_DEFAULT_ENTITY_PATHS,
} from "../../src/utils/kb-paths.js";

describe("config (canonical contract)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-config-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("loadEntityPaths always returns canonical paths", () => {
    expect(loadEntityPaths(tmpDir)).toEqual(CANONICAL_ENTITY_PATHS);
    expect(loadEntityPaths()).toEqual(CANONICAL_ENTITY_PATHS);
  });

  test("legacyConfigExists is false when no legacy config is present", () => {
    expect(legacyConfigExists(tmpDir)).toBe(false);
  });

  test("readLegacyKbConfig returns none when config is absent", () => {
    expect(readLegacyKbConfig(tmpDir)).toEqual({ kind: "none" });
  });

  test("readLegacyKbConfig reads legacy paths for migration", () => {
    mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    writeFileSync(
      path.join(tmpDir, ".kb", "config.json"),
      JSON.stringify({
        schemaVersion: 4,
        semanticAdvisorBackfill: "pending",
        paths: {
          requirements: "documentation/requirements",
          symbols: "documentation/symbols.yaml",
        },
      }),
      "utf8",
    );

    const result = readLegacyKbConfig(tmpDir);
    expect(result.kind).toBe("present");
    if (result.kind !== "present") return;

    expect(result.config.schemaVersion).toBe(4);
    expect(result.config.paths?.requirements).toBe(
      "documentation/requirements",
    );
    expect(result.config.paths?.symbols).toBe("documentation/symbols.yaml");
  });

  test("resolveLegacyEntityPaths merges configured paths with legacy defaults", () => {
    const resolved = resolveLegacyEntityPaths({
      paths: { requirements: "custom/requirements" },
    });
    expect(resolved.requirements).toBe("custom/requirements");
    expect(resolved.scenarios).toBe(LEGACY_DEFAULT_ENTITY_PATHS.scenarios);
    expect(resolved.symbols).toBe(LEGACY_DEFAULT_ENTITY_PATHS.symbols);
  });

  test("readLegacyKbConfig reports malformed JSON", () => {
    mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    writeFileSync(path.join(tmpDir, ".kb", "config.json"), "{", "utf8");
    const result = readLegacyKbConfig(tmpDir);
    expect(result.kind).toBe("malformed");
  });
});
