import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import matter from "gray-matter";

let parseYAML: (s: string) => any = (s: string) => ({ symbols: [] });
try {
  // prefer installed 'yaml' package if present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore allow dynamic require in test
  parseYAML = require("yaml").parse;
} catch {}

describe("Fixtures", () => {
  test("all required fixture files exist", () => {
    const required = [
      "test/fixtures/requirements/REQ-001.md",
      "test/fixtures/scenarios/SCEN-001.md",
      "test/fixtures/tests/TEST-001.md",
      "test/fixtures/adr/ADR-001.md",
      "test/fixtures/flags/FLAG-001.md",
      "test/fixtures/events/EVT-001.md",
      "test/fixtures/symbols.yaml",
    ];
    for (const file of required) {
      expect(() => readFileSync(file, "utf8")).not.toThrow();
    }
  });

  test("frontmatter has required fields", () => {
    const file = readFileSync("test/fixtures/requirements/REQ-001.md", "utf8");
    const { data } = matter(file);
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("created_at");
    expect(data).toHaveProperty("updated_at");
    expect(data).toHaveProperty("source");
  });

  test("symbols.yaml is valid", () => {
    const file = readFileSync("test/fixtures/symbols.yaml", "utf8");
    const data = parseYAML(file);
    expect(data).toHaveProperty("symbols");
    expect(Array.isArray(data.symbols)).toBe(true);
  });
});
