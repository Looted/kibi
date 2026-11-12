import { describe, expect, test } from "bun:test";
import {
  KIBI_IMPACT_DIAGNOSTICS,
  KIBI_IMPACT_DIAGNOSTIC_IDS,
  classifyKibiImpactEvidence,
  isBehaviorSourceEdit,
  isSupportedBehaviorSourcePath,
} from "../../src/traceability/staged-impact-contract.js";

describe("diagnostic contract", () => {
  test("lists the stable ids", () => {
    expect([...KIBI_IMPACT_DIAGNOSTIC_IDS]).toStrictEqual([
      "kibi_impact_evidence_missing",
      "symbols_manifest_stale",
    ]);
  });

  test("pins every title and resolution step", () => {
    expect(KIBI_IMPACT_DIAGNOSTICS).toStrictEqual({
      kibi_impact_evidence_missing: {
        id: "kibi_impact_evidence_missing",
        title: "Behavior edit requires staged Kibi impact evidence",
        resolution: [
          "Query Kibi via visible MCP tools or the trusted project-local CLI (peer surfaces): use kb_search for discovery, then kb_query for exact follow-up.",
          "MCP writes update KB state but do not stage tracked evidence; also stage related KB entity markdown under .kb/ or authored .kb/symbols.yaml metadata (the Detail lines name the symbols lacking evidence).",
          "Re-run or let the hook run kibi check --staged.",
        ],
      },
      symbols_manifest_stale: {
        id: "symbols_manifest_stale",
        title: "Symbol manifest does not cover the staged declarations",
        resolution: [
          "Read the Detail lines: they name the extracted symbols the staged .kb/symbols.yaml does not cover, and the entries whose declaration is gone.",
          "Author .kb/symbols.yaml entries for the uncovered symbols (kibi upsert, with implements/covered_by links); re-point or remove (kibi delete) entries whose declaration is gone.",
          "Stage .kb/symbols.yaml in the same change as the behavior edit, then re-run or let the hook run kibi check --staged. Symbol coordinates are derived locally and never staged.",
        ],
      },
    });
  });
});

describe("classifyKibiImpactEvidence", () => {
  test("an override line is not evidence", () => {
    expect(
      classifyKibiImpactEvidence({ filePath: "notes/impact.md" }),
    ).toBeNull();
  });

  test("entity markdown in a lane is evidence", () => {
    expect(
      classifyKibiImpactEvidence({ filePath: ".kb/requirements/REQ-a.md" }),
    ).toBe("entity_markdown");
    expect(
      classifyKibiImpactEvidence({ filePath: ".kb/requirements/REQ-a.txt" }),
    ).toBeNull();
    expect(
      classifyKibiImpactEvidence({ filePath: "docs/REQ-a.md" }),
    ).toBeNull();
    expect(classifyKibiImpactEvidence({ filePath: "" })).toBeNull();
    expect(classifyKibiImpactEvidence({})).toBeNull();
  });

  test("a symbols manifest counts only when extraction output changed", () => {
    for (const filePath of [
      ".kb/symbols.yaml",
      ".kb/symbols.yml",
      ".kb\\symbols.yaml",
      ".kb\\symbols.yml",
    ]) {
      expect(
        classifyKibiImpactEvidence({ filePath, extractionOutputChanged: true }),
      ).toBe("symbols_manifest");
      expect(classifyKibiImpactEvidence({ filePath })).toBeNull();
    }
    expect(
      classifyKibiImpactEvidence({
        filePath: "src/symbols.yaml",
        extractionOutputChanged: true,
      }),
    ).toBeNull();
  });
});

describe("isBehaviorSourceEdit", () => {
  const edit = (diffText: string, overrides: Record<string, unknown> = {}) =>
    isBehaviorSourceEdit({
      path: "src/a.ts",
      diffText,
      intersectsBehaviorBearingSymbol: true,
      ...overrides,
    });

  test("supported paths are TypeScript and JavaScript sources", () => {
    expect(isSupportedBehaviorSourcePath("src/a.ts")).toBe(true);
    expect(isSupportedBehaviorSourcePath("src/a.js")).toBe(true);
    expect(isSupportedBehaviorSourcePath("src/a.py")).toBe(false);
    expect(edit("+x = 1", { path: "src/a.py" })).toBe(false);
  });

  test("needs a behavior-bearing symbol or a user-facing surface", () => {
    expect(edit("+x = 1", { intersectsBehaviorBearingSymbol: false })).toBe(
      false,
    );
    expect(
      edit("+x = 1", {
        intersectsBehaviorBearingSymbol: false,
        knownUserFacingSurface: true,
      }),
    ).toBe(true);
    expect(edit("+x = 1")).toBe(true);
  });

  test("ignores headers, context, blank and comment-only changes", () => {
    expect(edit("")).toBe(false);
    expect(edit("--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n x")).toBe(false);
    expect(edit("+\n+   \n-// c\n+/* c\n+ * c\n+*/")).toBe(false);
    expect(edit("+// c\r\n+value()")).toBe(true);
  });

  test("a whitespace-only rewrite is not a behavior edit", () => {
    expect(edit("-a(b, c)\n+a( b,c )")).toBe(false);
    expect(edit("-a(b)\n-\n+a(b)")).toBe(false);
    expect(edit("-a(b)\n+a(c)")).toBe(true);
    expect(edit("-a(b)\n-d()\n+a(b)")).toBe(true);
    expect(edit("-a(b)")).toBe(true);
    expect(edit("-a\n-b\n+ab")).toBe(true);
    expect(edit("-ab\n+a\n+b")).toBe(true);
  });

  test("keeps the changed text after the diff marker", () => {
    expect(edit("-+a\n++a")).toBe(false);
    expect(edit("-a\n+-a")).toBe(true);
  });
});
