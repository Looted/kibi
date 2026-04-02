/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import { type PathKind, analyzePath } from "../src/path-kind.js";

describe("analyzePath", () => {
  test("identifies requirement files", () => {
    const result = analyzePath("documentation/requirements/REQ-001.md");
    expect(result.kind).toBe("requirement");
    expect(result.isKibiDocRelevant).toBe(true);
  });

  test("identifies scenario files", () => {
    const result = analyzePath("documentation/scenarios/SCEN-001.md");
    expect(result.kind).toBe("scenario");
    expect(result.isKibiDocRelevant).toBe(true);
  });

  test("identifies test files", () => {
    const result = analyzePath("documentation/tests/TEST-001.md");
    expect(result.kind).toBe("test");
    expect(result.isKibiDocRelevant).toBe(true);
  });

  test("identifies ADR files", () => {
    const result = analyzePath("documentation/adr/ADR-001.md");
    expect(result.kind).toBe("adr");
    expect(result.isKibiDocRelevant).toBe(true);
  });

  test("identifies fact files", () => {
    const result = analyzePath("documentation/facts/FACT-001.md");
    expect(result.kind).toBe("fact");
    expect(result.isKibiDocRelevant).toBe(true);
  });

  test("identifies TypeScript code files", () => {
    const result = analyzePath("src/index.ts");
    expect(result.kind).toBe("code");
    expect(result.isKibiDocRelevant).toBe(false);
  });

  test("identifies JavaScript code files", () => {
    const result = analyzePath("src/utils/helper.js");
    expect(result.kind).toBe("code");
  });

  test("identifies Python code files", () => {
    const result = analyzePath("src/main.py");
    expect(result.kind).toBe("code");
  });

  test("identifies files in .kb directory", () => {
    const result = analyzePath(".kb/config.json");
    expect(result.isUnderKb).toBe(true);
    expect(result.isKibiDocRelevant).toBe(false);
  });



  test("identifies unknown file types as unknown", () => {
    const result = analyzePath("README.txt");
    expect(result.kind).toBe("unknown");
  });

  test("handles markdown files outside docs", () => {
    const result = analyzePath("README.md");
    expect(result.kind).toBe("unknown");
    expect(result.isKibiDocRelevant).toBe(false);
  });

  test("isUnderKb is false for normal docs", () => {
    const result = analyzePath("documentation/requirements/REQ-001.md");
    expect(result.isUnderKb).toBe(false);
  });

  test("isUnderKb is true for .kb contents", () => {
    const result = analyzePath(".kb/branches/main/entities.json");
    expect(result.isUnderKb).toBe(true);
  });
});

describe("PathKind type", () => {
  test("has expected values", () => {
    const kinds: PathKind[] = [
      "code",
      "requirement",
      "scenario",
      "test",
      "adr",
      "fact",
      "flag",
      "event",
      "symbol",
      "unknown",
    ];
    for (const kind of kinds) {
      expect(typeof kind).toBe("string");
    }
  });
});
