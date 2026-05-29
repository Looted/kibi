import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import { load as parseYAML } from "js-yaml";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("Fixtures", () => {
  const fixturesDir = path.resolve(__dirname, "../../../test/fixtures");

  test("all required fixture files exist", () => {
    const required = [
      path.join(fixturesDir, "requirements/REQ-001.md"),
      path.join(fixturesDir, "scenarios/SCEN-001.md"),
      path.join(fixturesDir, "tests/TEST-001.md"),
      path.join(fixturesDir, "adr/ADR-001.md"),
      path.join(fixturesDir, "flags/FLAG-001.md"),
      path.join(fixturesDir, "events/EVT-001.md"),
      path.join(fixturesDir, "symbols.yaml"),
    ];
    for (const file of required) {
      expect(() => readFileSync(file, "utf8")).not.toThrow();
    }
  });

  test("frontmatter has required fields", () => {
    const file = readFileSync(
      path.join(fixturesDir, "requirements/REQ-001.md"),
      "utf8",
    );
    const { data } = matter(file);
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("created_at");
    expect(data).toHaveProperty("updated_at");
    expect(data).toHaveProperty("source");
  });

  test("symbols.yaml is valid", () => {
    const file = readFileSync(path.join(fixturesDir, "symbols.yaml"), "utf8");
    const data = parseYAML(file);
    expect(isRecord(data)).toBe(true);
    if (!isRecord(data)) return;
    expect(data).toHaveProperty("symbols");
    expect(Array.isArray(data.symbols)).toBe(true);
  });
});
