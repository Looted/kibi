/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getFileLinkedEntityIds,
  getFileLinkedTargetsByType,
} from "../src/file-entity-links";

describe("getFileLinkedEntityIds", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-fel-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  /** Helper to write a .kb/symbols.yaml in tmpDir */
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
          entry += "    links:\n";
          for (const link of e.links) {
            entry += `      - ${link}\n`;
          }
        }
        if (e.relationships && e.relationships.length > 0) {
          entry += "    relationships:\n";
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

  // ── Symbols lookup ────────────────────────────────────────────────

  test("returns implements targets from symbols with source 'symbols'", () => {
    writeSymbolsYaml([
      {
        id: "SYM-foo",
        sourceFile: "src/foo.ts",
        relationships: [{ type: "implements", target: "REQ-001" }],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/foo.ts"),
    );
    assert.deepEqual(result.ids, ["REQ-001"]);
    assert.equal(result.source, "symbols");
  });

  test("returns covered_by targets from symbols", () => {
    writeSymbolsYaml([
      {
        id: "SYM-foo",
        sourceFile: "src/foo.ts",
        relationships: [{ type: "covered_by", target: "TEST-001" }],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/foo.ts"),
    );
    assert.deepEqual(result.ids, ["TEST-001"]);
    assert.equal(result.source, "symbols");
  });

  test("returns executable_for targets from symbols", () => {
    writeSymbolsYaml([
      {
        id: "SYM-foo-test",
        sourceFile: "tests/foo.test.ts",
        relationships: [{ type: "executable_for", target: "TEST-001" }],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "tests/foo.test.ts"),
    );
    assert.deepEqual(result.ids, ["TEST-001"]);
    assert.equal(result.source, "symbols");
  });

  // ── Priority ordering ─────────────────────────────────────────────

  test("prioritizes implements → covered_by → executable_for → static links", () => {
    writeSymbolsYaml([
      {
        id: "SYM-prio",
        sourceFile: "src/prio.ts",
        links: ["LINK-static"],
        relationships: [
          { type: "executable_for", target: "TEST-exec" },
          { type: "covered_by", target: "TEST-cov" },
          { type: "implements", target: "REQ-impl" },
        ],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/prio.ts"),
    );
    assert.deepEqual(result.ids, ["REQ-impl", "TEST-cov", "TEST-exec"]);
  });

  test("fills remaining slots with static links after relationships", () => {
    writeSymbolsYaml([
      {
        id: "SYM-mix",
        sourceFile: "src/mix.ts",
        links: ["REQ-S2", "REQ-S3", "REQ-S4"],
        relationships: [{ type: "implements", target: "REQ-I1" }],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/mix.ts"),
    );
    // implements first, then static links fill remaining slots (max 3)
    assert.deepEqual(result.ids, ["REQ-I1", "REQ-S2", "REQ-S3"]);
  });

  // ── Dedupe ────────────────────────────────────────────────────────

  test("dedupes IDs across multiple symbol rows preserving file order", () => {
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

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/dup.ts"),
    );
    assert.deepEqual(result.ids, ["REQ-A", "REQ-B", "REQ-C"]);
  });

  test("dedupes across relationship types and static links", () => {
    writeSymbolsYaml([
      {
        id: "SYM-dedup",
        sourceFile: "src/dedup.ts",
        links: ["REQ-A"],
        relationships: [
          { type: "implements", target: "REQ-A" },
          { type: "covered_by", target: "REQ-B" },
        ],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/dedup.ts"),
    );
    // REQ-A from implements takes priority, deduped from links
    assert.deepEqual(result.ids, ["REQ-A", "REQ-B"]);
  });

  // ── Max-3 truncation ──────────────────────────────────────────────

  test("truncates to max 3 IDs", () => {
    writeSymbolsYaml([
      {
        id: "SYM-max",
        sourceFile: "src/max.ts",
        relationships: [
          { type: "implements", target: "REQ-1" },
          { type: "implements", target: "REQ-2" },
          { type: "implements", target: "REQ-3" },
          { type: "implements", target: "REQ-4" },
          { type: "covered_by", target: "TEST-5" },
        ],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/max.ts"),
    );
    assert.equal(result.ids.length, 3);
    assert.deepEqual(result.ids, ["REQ-1", "REQ-2", "REQ-3"]);
  });

  // ── Doc-path identity ─────────────────────────────────────────────

  test("maps .kb/requirements/REQ-001.md to REQ-001 via doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "requirements");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "REQ-001.md"), "---\nid: REQ-001\n---");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/requirements/REQ-001.md"),
    );
    assert.deepEqual(result.ids, ["REQ-001"]);
    assert.equal(result.source, "doc-path");
  });

  test("maps .kb/scenarios/SCEN-001.md via doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "scenarios");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "SCEN-001.md"), "");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/scenarios/SCEN-001.md"),
    );
    assert.deepEqual(result.ids, ["SCEN-001"]);
    assert.equal(result.source, "doc-path");
  });

  test("maps .kb/tests/TEST-001.md via doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "tests");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "TEST-001.md"), "");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/tests/TEST-001.md"),
    );
    assert.deepEqual(result.ids, ["TEST-001"]);
    assert.equal(result.source, "doc-path");
  });

  test("maps .kb/adr/ADR-001.md via doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "adr");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "ADR-001.md"), "");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/adr/ADR-001.md"),
    );
    assert.deepEqual(result.ids, ["ADR-001"]);
    assert.equal(result.source, "doc-path");
  });

  test("maps .kb/flags/FLAG-001.md via doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "flags");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "FLAG-001.md"), "");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/flags/FLAG-001.md"),
    );
    assert.deepEqual(result.ids, ["FLAG-001"]);
    assert.equal(result.source, "doc-path");
  });

  test("maps .kb/events/EVT-001.md via doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "events");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "EVT-001.md"), "");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/events/EVT-001.md"),
    );
    assert.deepEqual(result.ids, ["EVT-001"]);
    assert.equal(result.source, "doc-path");
  });

  test("maps .kb/facts/FACT-001.md via doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "facts");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "FACT-001.md"), "");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/facts/FACT-001.md"),
    );
    assert.deepEqual(result.ids, ["FACT-001"]);
    assert.equal(result.source, "doc-path");
  });

  test("does not match non-entity files in doc roots as doc-path", () => {
    const docDir = path.join(tmpDir, "documentation", "requirements");
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, "README.md"), "# Requirements");

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, ".kb/requirements/README.md"),
    );
    // README.md doesn't match REQ-*, SCEN-*, etc. pattern
    assert.deepEqual(result.ids, []);
    assert.equal(result.source, "none");
  });

  // ── Path normalization ────────────────────────────────────────────

  test("handles relative path input by resolving against worktree", () => {
    writeSymbolsYaml([
      {
        id: "SYM-rel",
        sourceFile: "src/rel.ts",
        relationships: [{ type: "implements", target: "REQ-rel" }],
      },
    ]);

    // Pass relative path
    const result = getFileLinkedEntityIds(tmpDir, "src/rel.ts");
    assert.deepEqual(result.ids, ["REQ-rel"]);
    assert.equal(result.source, "symbols");
  });

  // ── Empty / missing cases ─────────────────────────────────────────

  test("returns empty with source 'none' when no symbols.yaml and not a doc path", () => {
    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/orphan.ts"),
    );
    assert.deepEqual(result.ids, []);
    assert.equal(result.source, "none");
  });

  test("returns empty with source 'none' when file not in symbols and not a doc path", () => {
    writeSymbolsYaml([
      {
        id: "SYM-other",
        sourceFile: "src/other.ts",
        relationships: [{ type: "implements", target: "REQ-001" }],
      },
    ]);

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/notfound.ts"),
    );
    assert.deepEqual(result.ids, []);
    assert.equal(result.source, "none");
  });

  // ── Handles both YAML formats ─────────────────────────────────────

  test("handles bare array YAML format", () => {
    writeSymbolsYaml(
      [
        {
          id: "SYM-bare",
          sourceFile: "src/bare.ts",
          relationships: [{ type: "implements", target: "REQ-bare" }],
        },
      ],
      false,
    );

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/bare.ts"),
    );
    assert.deepEqual(result.ids, ["REQ-bare"]);
  });

  test("handles { symbols: [...] } YAML format", () => {
    writeSymbolsYaml(
      [
        {
          id: "SYM-wrap",
          sourceFile: "src/wrap.ts",
          relationships: [{ type: "implements", target: "REQ-wrap" }],
        },
      ],
      true,
    );

    const result = getFileLinkedEntityIds(
      tmpDir,
      path.join(tmpDir, "src/wrap.ts"),
    );
    assert.deepEqual(result.ids, ["REQ-wrap"]);
  });
});

describe("getFileLinkedTargetsByType", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-fel-bytype-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  function writeSymbolsYaml(
    entries: Array<{
      id: string;
      sourceFile: string;
      relationships?: Array<{ type: string; target: string }>;
    }>,
  ) {
    const docDir = path.join(tmpDir, "documentation");
    fs.mkdirSync(docDir, { recursive: true });

    const entriesYaml = entries
      .map((e) => {
        let entry = `  - id: ${e.id}\n    sourceFile: ${e.sourceFile}\n`;
        if (e.relationships && e.relationships.length > 0) {
          entry += "    relationships:\n";
          for (const rel of e.relationships) {
            entry += `      - type: ${rel.type}\n        target: ${rel.target}\n`;
          }
        }
        return entry;
      })
      .join("\n");

    fs.writeFileSync(path.join(docDir, "symbols.yaml"), entriesYaml);
  }

  test("filters by single relationship type", () => {
    writeSymbolsYaml([
      {
        id: "SYM-multi",
        sourceFile: "src/multi.ts",
        relationships: [
          { type: "implements", target: "REQ-001" },
          { type: "covered_by", target: "TEST-001" },
          { type: "executable_for", target: "TEST-002" },
        ],
      },
    ]);

    const targets = getFileLinkedTargetsByType(
      tmpDir,
      path.join(tmpDir, "src/multi.ts"),
      ["implements"],
    );
    assert.deepEqual(targets, ["REQ-001"]);
  });

  test("filters by multiple relationship types", () => {
    writeSymbolsYaml([
      {
        id: "SYM-multi2",
        sourceFile: "src/multi2.ts",
        relationships: [
          { type: "implements", target: "REQ-001" },
          { type: "covered_by", target: "TEST-001" },
          { type: "executable_for", target: "TEST-002" },
        ],
      },
    ]);

    const targets = getFileLinkedTargetsByType(
      tmpDir,
      path.join(tmpDir, "src/multi2.ts"),
      ["implements", "covered_by"],
    );
    assert.deepEqual(targets, ["REQ-001", "TEST-001"]);
  });

  test("returns empty when no matching relationship types", () => {
    writeSymbolsYaml([
      {
        id: "SYM-none",
        sourceFile: "src/none.ts",
        relationships: [{ type: "implements", target: "REQ-001" }],
      },
    ]);

    const targets = getFileLinkedTargetsByType(
      tmpDir,
      path.join(tmpDir, "src/none.ts"),
      ["covered_by"],
    );
    assert.deepEqual(targets, []);
  });

  test("returns empty when no symbols.yaml", () => {
    const targets = getFileLinkedTargetsByType(
      tmpDir,
      path.join(tmpDir, "src/foo.ts"),
      ["implements"],
    );
    assert.deepEqual(targets, []);
  });
});
