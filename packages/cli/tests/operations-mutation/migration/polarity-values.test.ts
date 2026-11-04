import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  POLARITY_VALUE_BACKFILL_CODE,
  applyPolarityValueBackfill,
  planPolarityValueBackfill,
} from "../../../src/operations/migration/polarity-values.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const fact = (lines: string, body = "Body.\n") => `---\n${lines}---\n${body}`;
const legacy =
  "id: FACT-a\nfact_kind: property_value\npolarity: require\nsubject_key: s\nproperty_key: p\n";

describe("polarity value backfill", () => {
  test("the action code is stable", () => {
    expect(POLARITY_VALUE_BACKFILL_CODE).toBe("polarity_value_backfill");
  });

  test("plans a boolean encoding for each polarity-only fact", () => {
    const before = fact(legacy);
    const forbid = fact(
      legacy.replace("FACT-a", "FACT-b").replace("require", "forbid"),
    );
    const root = tempWorkspace({
      ".kb/facts/a.md": before,
      ".kb/facts/b.md": forbid,
      ".kb/requirements/REQ-x.md": fact(legacy.replace("FACT-a", "REQ-x")),
    });
    expect(planPolarityValueBackfill(root)).toStrictEqual([
      {
        id: "FACT-a",
        path: ".kb/facts/a.md",
        before,
        after: fact(
          `${legacy}operator: eq\nvalue_type: bool\nvalue_bool: true\n`,
        ),
      },
      {
        id: "FACT-b",
        path: ".kb/facts/b.md",
        before: forbid,
        after: `${forbid.slice(0, -"---\nBody.\n".length)}operator: eq\nvalue_type: bool\nvalue_bool: true\n---\nBody.\n`,
      },
    ]);
  });

  test("keeps CRLF line endings and derives a missing id from the file name", () => {
    const lines = legacy.replace("id: FACT-a\n", "").replaceAll("\n", "\r\n");
    const before = `---\r\n${lines}---\r\nBody.\r\n`;
    const root = tempWorkspace({ ".kb/facts/nested/FACT-file.md": before });
    expect(planPolarityValueBackfill(root)).toStrictEqual([
      {
        id: "FACT-file",
        path: ".kb/facts/nested/FACT-file.md",
        before,
        after: `---\r\n${lines}operator: eq\r\nvalue_type: bool\r\nvalue_bool: true\r\n---\r\nBody.\r\n`,
      },
    ]);
  });

  test("skips documents that are not polarity-only property facts", () => {
    const skipped: Record<string, string> = {
      ".kb/facts/no-frontmatter.md": "Just prose.\n",
      ".kb/facts/empty.md": "---\n---\nBody.\n",
      ".kb/facts/observation.md": fact(
        legacy.replace("property_value", "observation"),
      ),
      ".kb/facts/no-polarity.md": fact(
        legacy.replace("polarity: require\n", ""),
      ),
      ".kb/facts/other-polarity.md": fact(legacy.replace("require", "allow")),
    };
    for (const key of [
      "operator",
      "value_type",
      "value_bool",
      "value_int",
      "value_number",
      "value_string",
    ]) {
      skipped[`.kb/facts/has-${key}.md`] = fact(`${legacy}${key}: x\n`);
    }
    expect(planPolarityValueBackfill(tempWorkspace(skipped))).toStrictEqual([]);
  });

  test("refuses frontmatter that does not parse", () => {
    const root = tempWorkspace({ ".kb/facts/bad.md": fact("id: [unclosed\n") });
    expect(() => planPolarityValueBackfill(root)).toThrow(
      /^Cannot migrate fact \.kb\/facts\/bad\.md: unexpected end of the stream within a flow collection/,
    );
  });

  test("refuses polarity facts without subject or property key", () => {
    for (const missing of ["subject_key: s\n", "property_key: p\n"]) {
      const root = tempWorkspace({
        ".kb/facts/f.md": fact(legacy.replace(missing, "")),
      });
      expect(() => planPolarityValueBackfill(root)).toThrow(
        new Error(
          "Cannot migrate polarity fact .kb/facts/f.md: subject_key and property_key are required",
        ),
      );
    }
    const numeric = tempWorkspace({
      ".kb/facts/f.md": fact(
        legacy.replace("subject_key: s", "subject_key: 3"),
      ),
    });
    expect(() => planPolarityValueBackfill(numeric)).toThrow(
      "subject_key and property_key are required",
    );
  });

  test("refuses a rewrite that does not read back", () => {
    const indented = legacy
      .split("\n")
      .map((line) => (line ? `  ${line}` : line))
      .join("\n");
    const root = tempWorkspace({ ".kb/facts/f.md": fact(indented) });
    expect(() => planPolarityValueBackfill(root)).toThrow(
      new Error("Polarity migration could not verify .kb/facts/f.md"),
    );
  });

  test("applies the planned rewrites and reports how many", () => {
    const root = tempWorkspace({ ".kb/facts/a.md": fact(legacy) });
    expect(applyPolarityValueBackfill(root)).toBe(1);
    expect(readFileSync(path.join(root, ".kb/facts/a.md"), "utf8")).toBe(
      fact(`${legacy}operator: eq\nvalue_type: bool\nvalue_bool: true\n`),
    );
    expect(applyPolarityValueBackfill(root)).toBe(0);
  });
});
