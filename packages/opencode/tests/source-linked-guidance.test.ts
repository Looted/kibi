/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import { getSourceLinkedRequirementIds } from "../src/source-linked-guidance";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("getSourceLinkedRequirementIds", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-slg-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  /** Helper to write a documentation/symbols.yaml in tmpDir */
  function writeSymbolsYaml(
    entries: Array<{
      id: string;
      sourceFile: string;
      links?: string[];
      relationships?: Array<{ type: string; target: string }>;
    }>,
    wrapInSymbolsKey = false,
  ) {
    const docDir = path.join(tmpDir, "documentation");
    fs.mkdirSync(docDir, { recursive: true });

    const entriesYaml = entries
      .map((e) => {
        let entry = `  - id: ${e.id}\n    sourceFile: ${e.sourceFile}\n`;
        if (e.links && e.links.length > 0) {
          entry += `    links:\n`;
          for (const link of e.links) {
            entry += `      - ${link}\n`;
          }
        }
        if (e.relationships && e.relationships.length > 0) {
          entry += `    relationships:\n`;
          for (const rel of e.relationships) {
            entry += `      - type: ${rel.type}\n        target: ${rel.target}\n`;
          }
        }
        return entry;
      })
      .join("\n");

    const yamlContent = wrapInSymbolsKey
      ? `symbols:\n${entriesYaml}`
      : entriesYaml;

    fs.writeFileSync(path.join(docDir, "symbols.yaml"), yamlContent);
  }

  test("returns up to 3 deduped REQ IDs", () => {
    writeSymbolsYaml([
      {
        id: "SYM-foo",
        sourceFile: "src/foo.ts",
        relationships: [
          { type: "implements", target: "REQ-001" },
          { type: "implements", target: "REQ-002" },
          { type: "implements", target: "REQ-003" },
          { type: "implements", target: "REQ-004" },
        ],
      },
    ]);

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/foo.ts"),
    );
    assert.deepEqual(ids, ["REQ-001", "REQ-002", "REQ-003"]);
  });

  test("prioritizes implements relationships", () => {
    writeSymbolsYaml([
      {
        id: "SYM-bar",
        sourceFile: "src/bar.ts",
        links: ["REQ-static-1", "REQ-static-2"],
        relationships: [
          { type: "implements", target: "REQ-impl-1" },
          { type: "implements", target: "REQ-impl-2" },
        ],
      },
    ]);

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/bar.ts"),
    );
    // Only implements relationships are returned (static links not included)
    assert.deepEqual(ids, ["REQ-impl-1", "REQ-impl-2"]);
  });

  test("returns empty when no implements relationships", () => {
    writeSymbolsYaml([
      {
        id: "SYM-baz",
        sourceFile: "src/baz.ts",
        links: ["REQ-A", "REQ-B"],
        // No relationships field — static links only
      },
    ]);

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/baz.ts"),
    );
    // Static links are not returned when no implements relationships exist
    assert.deepEqual(ids, []);
  });

  test("handles bare array YAML format", () => {
    writeSymbolsYaml(
      [
        {
          id: "SYM-bare",
          sourceFile: "src/bare.ts",
          relationships: [
            { type: "implements", target: "REQ-bare-1" },
          ],
        },
      ],
      false, // bare array, no `symbols:` wrapper
    );

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/bare.ts"),
    );
    assert.deepEqual(ids, ["REQ-bare-1"]);
  });

  test("handles { symbols: [...] } YAML format", () => {
    writeSymbolsYaml(
      [
        {
          id: "SYM-wrapped",
          sourceFile: "src/wrapped.ts",
          relationships: [
            { type: "implements", target: "REQ-wrapped-1" },
          ],
        },
      ],
      true, // wrapped in `symbols:` key
    );

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/wrapped.ts"),
    );
    assert.deepEqual(ids, ["REQ-wrapped-1"]);
  });

  test("returns empty array when no file match", () => {
    writeSymbolsYaml([
      {
        id: "SYM-other",
        sourceFile: "src/other.ts",
        links: ["REQ-001"],
      },
    ]);

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/notfound.ts"),
    );
    assert.deepEqual(ids, []);
  });

  test("returns empty array when symbols.yaml missing", () => {
    // No writeSymbolsYaml call — file doesn't exist
    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/foo.ts"),
    );
    assert.deepEqual(ids, []);
  });

  test("dedupes IDs preserving file order", () => {
    // Two symbol rows for the same file, with overlapping REQ IDs
    writeSymbolsYaml([
      {
        id: "SYM-dup1",
        sourceFile: "src/dup.ts",
        relationships: [
          { type: "implements", target: "REQ-A" },
          { type: "implements", target: "REQ-B" },
        ],
      },
      {
        id: "SYM-dup2",
        sourceFile: "src/dup.ts",
        relationships: [
          { type: "implements", target: "REQ-B" },
          { type: "implements", target: "REQ-C" },
        ],
      },
    ]);

    const ids = getSourceLinkedRequirementIds(
      tmpDir,
      path.join(tmpDir, "src/dup.ts"),
    );
    // REQ-B appears in both rows but should be deduped, preserving first occurrence
    assert.deepEqual(ids, ["REQ-A", "REQ-B", "REQ-C"]);
  });
});
