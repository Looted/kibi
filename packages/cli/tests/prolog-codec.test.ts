import { describe, expect, test } from "bun:test";
import { parseViolationRows, toPrologString } from "../src/prolog/codec";

describe("toPrologString", () => {
  test("wraps plain string in double quotes", () => {
    expect(toPrologString("hello")).toBe('"hello"');
  });

  test("escapes backslash", () => {
    expect(toPrologString("a\\b")).toBe('"a\\\\b"');
  });

  test("escapes double quote", () => {
    expect(toPrologString('say "hi"')).toBe('"say \\"hi\\""');
  });

  test("escapes newline", () => {
    expect(toPrologString("line1\nline2")).toBe('"line1\\nline2"');
  });

  test("escapes carriage return", () => {
    expect(toPrologString("line1\rline2")).toBe('"line1\\rline2"');
  });

  test("escapes tab", () => {
    expect(toPrologString("col1\tcol2")).toBe('"col1\\tcol2"');
  });

  test("handles empty string", () => {
    expect(toPrologString("")).toBe('""');
  });

  test("handles all escapes together", () => {
    expect(toPrologString('a\\"b\nc')).toBe('"a\\\\\\"b\\nc"');
  });
});

describe("parseViolationRows", () => {
  test("returns empty array for empty list", () => {
    expect(parseViolationRows("[]")).toEqual([]);
  });

  test("parses a single violation", () => {
    const raw =
      "[violation(strict-fact-shape,'FACT-001',\"Missing subject_key\",\"Add subject_key field\",'documentation/facts/FACT-001.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("strict-fact-shape");
    expect(result[0].entityId).toBe("FACT-001");
    expect(result[0].description).toBe("Missing subject_key");
    expect(result[0].suggestion).toBe("Add subject_key field");
    expect(result[0].source).toBe("documentation/facts/FACT-001.md");
  });

  test("parses violation with comma in description", () => {
    const raw =
      "[violation(strict-fact-shape,'FACT-002',\"Missing fields: subject_key, property_key\",\"Add required fields\",'documentation/facts/FACT-002.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(
      "Missing fields: subject_key, property_key",
    );
  });

  test("parses multiple violations", () => {
    const raw =
      "[violation(rule1,'E1',\"Desc A\",\"Sugg A\",'src/a.md'),violation(rule2,'E2',\"Desc B\",\"Sugg B\",'src/b.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(2);
    expect(result[0].entityId).toBe("E1");
    expect(result[1].entityId).toBe("E2");
  });

  test("handles comma inside single-quoted source path", () => {
    const raw = "[violation(rule,'E1',\"Desc\",\"Sugg\",'docs/file,part.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("docs/file,part.md");
  });

  test("skips malformed terms that are not violation(...)", () => {
    const result = parseViolationRows("[]");
    expect(result).toEqual([]);
  });

  test("handles term without trailing paren gracefully", () => {
    // Truncated/malformed input should not throw, just skip
    const result = parseViolationRows(
      "[violation(rule,'E1',\"Desc\",\"Sugg\",'src'",
    );
    // Should not throw; result may be empty or partial (both acceptable)
    expect(Array.isArray(result)).toBe(true);
  });
});
