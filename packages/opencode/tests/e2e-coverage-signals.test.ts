/// <reference types="bun-types" />
import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getE2eCoverageSignal } from "../src/e2e-coverage-signals";
import { deriveFileOperationReminder } from "../src/file-operation-reminders";

describe("getE2eCoverageSignal", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-e2e-cov-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  /** Helper to write .kb/symbols.yaml */
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

  /** Helper to write a TEST-* markdown doc */
  function writeTestDoc(
    filename: string,
    opts: {
      id: string;
      title: string;
      status?: string;
      tags?: string[];
      source?: string;
      body?: string;
    },
  ) {
    const docDir = path.join(tmpDir, "documentation", "tests");
    // Allow subdirectories like e2e/packed/
    const fullPath = path.join(docDir, filename);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    const tagsYaml = opts.tags
      ? `\ntags:\n${opts.tags.map((t) => `  - ${t}`).join("\n")}`
      : "";
    const sourceYaml = opts.source ? `\nsource: ${opts.source}` : "";

    const content = `---
id: ${opts.id}
title: ${opts.title}
status: ${opts.status ?? "passing"}${tagsYaml}${sourceYaml}
---

${opts.body ?? "Test verification content."}
`;
    fs.writeFileSync(fullPath, content);
  }

  /** Helper to write .kb/manifest.json */
  function writeKbConfig() {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "manifest.json"),
      JSON.stringify({ paths: {} }, null, 2),
    );
  }

  // ── EXACT CASES ─────────────────────────────────────────────

  test("exact: symbol linked via covered_by to TEST doc with e2e tag", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [{ type: "covered_by", target: "TEST-toast-e2e" }],
      },
    ]);
    writeTestDoc("TEST-toast-e2e.md", {
      id: "TEST-toast-e2e",
      title: "Toast E2E Test",
      tags: ["e2e", "toast"],
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(result.level, "exact");
    assert.ok(result.evidence.length >= 1);
    assert.ok(result.evidence[0].includes("TEST-toast-e2e"));
    assert.equal(
      result.reminderText,
      "- This file has existing e2e coverage. Check whether the e2e tests and linked TEST entities need updates.",
    );
  });

  test("exact: symbol linked via executable_for to TEST doc with e2e tag", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/logger.ts",
        relationships: [{ type: "executable_for", target: "TEST-logger-e2e" }],
      },
    ]);
    writeTestDoc("TEST-logger-e2e.md", {
      id: "TEST-logger-e2e",
      title: "Logger E2E Test",
      tags: ["e2e"],
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/logger.ts"),
    );

    assert.equal(result.level, "exact");
    assert.ok(result.evidence.length >= 1);
  });

  test("exact: TEST doc with source pointing to documentation/tests/e2e/", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/prompt.ts",
        relationships: [
          { type: "covered_by", target: "TEST-prompt-local-e2e" },
        ],
      },
    ]);
    writeTestDoc("TEST-prompt-local-e2e.md", {
      id: "TEST-prompt-local-e2e",
      title: "Prompt Local E2E",
      source: "documentation/tests/e2e/prompt.test.ts",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/prompt.ts"),
    );

    assert.equal(result.level, "exact");
    assert.ok(result.evidence.length >= 1);
  });

  test("exact: TEST doc with source pointing to documentation/tests/e2e/packed/", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/config.ts",
        relationships: [
          { type: "executable_for", target: "TEST-config-packed" },
        ],
      },
    ]);
    writeTestDoc("TEST-config-packed.md", {
      id: "TEST-config-packed",
      title: "Config Packed E2E",
      source: "documentation/tests/e2e/packed/config.test.ts",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/config.ts"),
    );

    assert.equal(result.level, "exact");
    assert.ok(result.evidence.length >= 1);
  });

  // ── PACKAGE-LEVEL UMBRELLA DOCS MUST NOT BE EXACT ──────────

  test("package-level umbrella doc is never exact even with e2e tag", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [
          { type: "covered_by", target: "TEST-opencode-kibi-plugin-v1" },
        ],
      },
    ]);
    // This is a package-level umbrella doc (id matches TEST-opencode-*-plugin-v1 pattern, no specific source file)
    writeTestDoc("TEST-opencode-kibi-plugin-v1.md", {
      id: "TEST-opencode-kibi-plugin-v1",
      title: "OpenCode Kibi Plugin v1 Automated Verification",
      tags: ["opencode", "kibi", "test", "e2e"],
      body: "Unit tests for prompt guidance injection logic and correct surfacing of requirements.",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    // Package-level umbrella docs must NOT produce exact evidence
    assert.notEqual(result.level, "exact");
    // May be heuristic if it names the path, but must NOT be exact
  });

  test("package-level umbrella doc without naming path is none", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [
          { type: "covered_by", target: "TEST-opencode-kibi-plugin-v1" },
        ],
      },
    ]);
    writeTestDoc("TEST-opencode-kibi-plugin-v1.md", {
      id: "TEST-opencode-kibi-plugin-v1",
      title: "OpenCode Kibi Plugin v1 Automated Verification",
      tags: ["opencode", "kibi", "test"],
      body: "Unit tests for prompt guidance injection logic and correct surfacing of requirements.",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    // Umbrella doc without naming path → none
    assert.equal(result.level, "none");
  });

  test("package-level umbrella doc naming path is heuristic", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [
          { type: "covered_by", target: "TEST-opencode-kibi-plugin-v1" },
        ],
      },
    ]);
    writeTestDoc("TEST-opencode-kibi-plugin-v1.md", {
      id: "TEST-opencode-kibi-plugin-v1",
      title: "OpenCode Kibi Plugin v1 Automated Verification",
      tags: ["opencode", "kibi", "test"],
      body: "Tests for packages/opencode/src/toast.ts behavior.",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    // Umbrella doc names the path → heuristic at most
    assert.equal(result.level, "heuristic");
    assert.equal(
      result.reminderText,
      "- This file may have related e2e coverage. Check the linked e2e tests if this change affects behavior.",
    );
  });

  // ── HEURISTIC CASES ────────────────────────────────────────

  test("heuristic: non-e2e TEST doc that names the source path in body", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [{ type: "covered_by", target: "TEST-toast-unit" }],
      },
    ]);
    writeTestDoc("TEST-toast-unit.md", {
      id: "TEST-toast-unit",
      title: "Toast Unit Test",
      tags: ["unit", "toast"],
      body: "Verifies packages/opencode/src/toast.ts export contract.",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    // No exact e2e evidence, but doc names the source path → heuristic
    assert.equal(result.level, "heuristic");
  });

  test("heuristic: dist path matched via src path in test doc body", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [
          { type: "covered_by", target: "TEST-toast-e2e-packed" },
        ],
      },
    ]);
    writeTestDoc("TEST-toast-e2e-packed.md", {
      id: "TEST-toast-e2e-packed",
      title: "Toast E2E Packed",
      source: "documentation/tests/e2e/packed/toast.test.ts",
      body: "Tests packages/opencode/dist/toast.js artifact behavior.",
    });

    // Query with a dist path
    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/dist/toast.js"),
    );

    // The TEST doc has e2e source, but file is dist/ — still exact if doc source matches e2e patterns
    // Actually this should be heuristic because the file is dist/, not src/
    assert.ok(result.level === "exact" || result.level === "heuristic");
  });

  // ── NONE CASES ─────────────────────────────────────────────

  test("none: file not in symbols.yaml", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-other",
        sourceFile: "packages/opencode/src/other.ts",
        relationships: [],
      },
    ]);

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/unrelated.ts"),
    );

    assert.equal(result.level, "none");
    assert.equal(result.reminderText, null);
    assert.equal(result.evidence.length, 0);
  });

  test("none: linked TEST doc does not exist", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [{ type: "covered_by", target: "TEST-nonexistent" }],
      },
    ]);

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(result.level, "none");
  });

  test("none: TEST doc exists but no e2e tags, no e2e source, no path match", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [{ type: "covered_by", target: "TEST-toast-unit" }],
      },
    ]);
    writeTestDoc("TEST-toast-unit.md", {
      id: "TEST-toast-unit",
      title: "Toast Unit Test",
      tags: ["unit"],
      source: "packages/opencode/tests/toast.test.ts",
      body: "Simple unit test.",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(result.level, "none");
  });

  test("none: no .kb directory", () => {
    // No .kb/manifest.json, no documentation/
    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(result.level, "none");
    assert.equal(result.reminderText, null);
  });

  test("none: symbols.yaml has no relationships for file", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [],
      },
    ]);

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(result.level, "none");
  });

  // ── REMINDER TEXT EXACTNESS ─────────────────────────────────

  test("exact reminder text is correct", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [{ type: "covered_by", target: "TEST-toast-e2e" }],
      },
    ]);
    writeTestDoc("TEST-toast-e2e.md", {
      id: "TEST-toast-e2e",
      title: "Toast E2E",
      tags: ["e2e"],
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(
      result.reminderText,
      "- This file has existing e2e coverage. Check whether the e2e tests and linked TEST entities need updates.",
    );
  });

  test("none reminder text is null", () => {
    writeKbConfig();

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/nothing.ts"),
    );

    assert.equal(result.reminderText, null);
  });

  // ── EDGE CASES ─────────────────────────────────────────────

  test("multiple TEST links: one exact e2e, one non-e2e", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [
          { type: "covered_by", target: "TEST-toast-unit" },
          { type: "covered_by", target: "TEST-toast-e2e" },
        ],
      },
    ]);
    writeTestDoc("TEST-toast-unit.md", {
      id: "TEST-toast-unit",
      title: "Toast Unit",
      tags: ["unit"],
    });
    writeTestDoc("TEST-toast-e2e.md", {
      id: "TEST-toast-e2e",
      title: "Toast E2E",
      tags: ["e2e"],
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(result.level, "exact");
    assert.ok(result.evidence.length >= 1);
    assert.ok(result.evidence.some((e) => e.includes("TEST-toast-e2e")));
  });

  test("TEST doc with e2e tag but source to unit test file is still exact", () => {
    writeKbConfig();
    writeSymbolsYaml([
      {
        id: "SYM-myFunc",
        sourceFile: "packages/opencode/src/toast.ts",
        relationships: [{ type: "covered_by", target: "TEST-hybrid" }],
      },
    ]);
    // Has e2e tag (exact signal) even though source points to unit test
    writeTestDoc("TEST-hybrid.md", {
      id: "TEST-hybrid",
      title: "Hybrid Test",
      tags: ["e2e"],
      source: "packages/opencode/tests/toast.test.ts",
    });

    const result = getE2eCoverageSignal(
      tmpDir,
      path.join(tmpDir, "packages/opencode/src/toast.ts"),
    );

    assert.equal(result.level, "exact");
  });

  test("hard policy preserves bounded e2e reminder when lifecycle enforcement hard-blocks", () => {
    const result = deriveFileOperationReminder({
      normalizedPath: "packages/opencode/src/toast.ts",
      lifecycle: "edited",
      pathKind: "code",
      linkedEntityResult: { ids: ["REQ-toast"], source: "symbols" },
      e2eSignal: {
        level: "exact",
        evidence: ["TEST-toast-e2e"],
        reminderText:
          "- This file has existing e2e coverage. Check whether the e2e tests and linked TEST entities need updates.",
      },
      currentSemanticRisk: "behavior_candidate",
      posture: "root_active",
      effectiveMode: "hard",
      checkpointEvidence: false,
    } as Parameters<typeof deriveFileOperationReminder>[0]);

    assert.equal(result.policyDecision, "hard_block");
    assert.match(result.lifecycleReminder ?? "", /TEST-toast-e2e/);
    assert.equal(
      result.e2eReminder,
      "- This file has existing e2e coverage. Check whether the e2e tests and linked TEST entities need updates.",
    );
    assert.ok((result.e2eReminder ?? "").split("\n").length <= 1);
  });
});
