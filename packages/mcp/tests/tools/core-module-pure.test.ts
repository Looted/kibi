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
import { toPrologAtom, toPrologList } from "../../src/tools/core-module.js";

describe("toPrologAtom", () => {
  test("returns 'none' for undefined", () => {
    expect(toPrologAtom(undefined)).toBe("none");
  });

  test("returns 'none' for empty string", () => {
    expect(toPrologAtom("")).toBe("none");
  });

  test("wraps simple string in quotes", () => {
    expect(toPrologAtom("hello")).toBe("'hello'");
  });

  test("escapes single quotes", () => {
    expect(toPrologAtom("it's")).toBe("'it''s'");
  });

  test("handles special characters", () => {
    expect(toPrologAtom("hello@world.com")).toBe("'hello@world.com'");
    expect(toPrologAtom("path/to/file")).toBe("'path/to/file'");
  });

  test("handles numeric strings", () => {
    expect(toPrologAtom("123")).toBe("'123'");
  });
});

describe("toPrologList", () => {
  test("returns empty list for undefined", () => {
    expect(toPrologList(undefined)).toBe("[]");
  });

  test("returns empty list for empty array", () => {
    expect(toPrologList([])).toBe("[]");
  });

  test("formats single item", () => {
    expect(toPrologList(["hello"])).toBe("['hello']");
  });

  test("formats multiple items", () => {
    expect(toPrologList(["a", "b", "c"])).toBe("['a','b','c']");
  });

  test("escapes quotes in items", () => {
    expect(toPrologList(["it's", "don't"])).toBe("['it''s','don''t']");
  });
});
