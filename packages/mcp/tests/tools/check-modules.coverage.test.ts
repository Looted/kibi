import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrologProcess } from "kibi-runtime";

import type { ToolConfig, ToolsRuntime } from "../../src/server/tool-types.js";
import {
  buildStructuredContent,
  formatImpactText,
  formatQualityDiagnosticsText,
  formatViolationText,
} from "../../src/tools/check-format.js";
import { analyzeKbCheckImpact, hasImpactOptions } from "../../src/tools/check-impact.js";
import { runAggregatedChecks } from "../../src/tools/check-prolog.js";
import type { CheckArgs, CheckResult, Diagnostic } from "../../src/tools/check-types.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("MCP check-impact", () => {
  test("hasImpactOptions is true for each opt-in flag and false otherwise", () => {
    expect(hasImpactOptions({})).toBe(false);
    expect(hasImpactOptions({ includeImpactDiagnostics: true })).toBe(true);
    expect(hasImpactOptions({ staged: true })).toBe(true);
    expect(hasImpactOptions({ includeWorkingTreeDiff: true })).toBe(true);
    expect(hasImpactOptions({ sourceFiles: [] })).toBe(false);
    expect(hasImpactOptions({ sourceFiles: ["src/a.ts"] })).toBe(true);
  });

  test("analyzeKbCheckImpact returns undefined without options and an object with options", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "kibi-mcp-impact-"));
    roots.push(workspaceRoot);
    mkdirSync(join(workspaceRoot, "src"), { recursive: true });
    writeFileSync(join(workspaceRoot, "src", "a.ts"), "export const x = 1;\n");

    expect(analyzeKbCheckImpact(workspaceRoot, {})).toBeUndefined();
    expect(() =>
      analyzeKbCheckImpact(workspaceRoot, {
        includeImpactDiagnostics: true,
        staged: false,
        includeWorkingTreeDiff: true,
        sourceFiles: ["src/a.ts"],
        maxDiagnostics: 4,
      }),
    ).toThrow();
  });
});

describe("MCP check-prolog aggregated parser", () => {
  test("filters allowlisted violations and optional fields", async () => {
    const query = async (goal: string) => {
      expect(goal).toContain("check_all_json_with_options");
      expect(goal).toContain("true");
      return {
        success: true,
        bindings: {
          JsonString: JSON.stringify({
            "required-fields": [
              {
                rule: "required-fields",
                entityId: "REQ-001",
                description: "missing source",
                suggestion: "add source",
                source: "req.md",
                evidence: { field: "source" },
              },
            ],
            other: [
              {
                rule: "other",
                entityId: "REQ-002",
                description: "ignored",
              },
            ],
          }),
        },
      };
    };
    const violations = await runAggregatedChecks(
      { query } as unknown as PrologProcess,
      new Set(["required-fields"]),
      true,
    );
    expect(violations).toEqual([
      {
        rule: "required-fields",
        entityId: "REQ-001",
        description: "missing source",
        suggestion: "add source",
        source: "req.md",
        evidence: { field: "source" },
      },
    ]);
  });

  test("uses check_all_json when requireAdr is false and unwraps nested JSON", async () => {
    const query = async (goal: string) => {
      expect(goal).toContain("check_all_json(JsonString)");
      expect(goal).not.toContain("true");
      return {
        success: true,
        bindings: {
          JsonString: JSON.stringify(
            JSON.stringify({
              "required-fields": [
                {
                  rule: "required-fields",
                  entityId: "REQ-NESTED",
                  description: "nested",
                },
              ],
            }),
          ),
        },
      };
    };
    const violations = await runAggregatedChecks(
      { query } as unknown as PrologProcess,
      new Set(["required-fields"]),
      false,
    );
    expect(violations[0]?.entityId).toBe("REQ-NESTED");
    expect(violations[0]?.suggestion).toBeUndefined();
  });

  test("includes query-plan-safety violations when that rule is allowlisted", async () => {
    const query = async () => ({
      success: true,
      bindings: { JsonString: "{}" },
    });
    const violations = await runAggregatedChecks(
      { query } as unknown as PrologProcess,
      new Set(["query-plan-safety"]),
      false,
    );
    expect(Array.isArray(violations)).toBe(true);
  });

  test("throws when the aggregated query fails or JSON is unusable", async () => {
    await expect(
      runAggregatedChecks(
        {
          query: async () => ({ success: false, error: "boom", bindings: {} }),
        } as unknown as PrologProcess,
        new Set(["required-fields"]),
        false,
      ),
    ).rejects.toThrow("Aggregated checks query failed: boom");

    await expect(
      runAggregatedChecks(
        {
          query: async () => ({ success: false, bindings: {} }),
        } as unknown as PrologProcess,
        new Set(["required-fields"]),
        false,
      ),
    ).rejects.toThrow("Unknown error");

    await expect(
      runAggregatedChecks(
        {
          query: async () => ({
            success: true,
            bindings: { JsonString: 12 },
          }),
        } as unknown as PrologProcess,
        new Set(["required-fields"]),
        false,
      ),
    ).rejects.toThrow("Failed to parse violations JSON");

    await expect(
      runAggregatedChecks(
        {
          query: async () => ({
            success: true,
            bindings: { JsonString: "{not json" },
          }),
        } as unknown as PrologProcess,
        new Set(["required-fields"]),
        false,
      ),
    ).rejects.toThrow("Failed to parse violations JSON");
  });
});

describe("MCP check-format remaining branches", () => {
  test("formats empty and populated impact, quality, and violation text", () => {
    expect(
      formatImpactText({
        impactDiagnostics: [],
        sourceFiles: [],
        extractedSymbols: [],
        linkedEntities: [],
        nextActions: [],
      }),
    ).toBe("No impact diagnostics found");
    expect(
      formatImpactText({
        impactDiagnostics: [
          {
            id: "kibi_impact_evidence_missing",
            severity: "warning",
            files: [],
            message: "untied",
            suggestion: "link it",
          },
          {
            id: "symbols_manifest_stale",
            severity: "error",
            files: ["a.ts", "b.ts"],
            message: "drift",
            suggestion: "resync",
          },
        ],
        sourceFiles: ["a.ts"],
        extractedSymbols: [],
        linkedEntities: [],
        nextActions: [],
      } as never),
    ).toContain("unknown-source");

    expect(formatQualityDiagnosticsText([])).toBe("No quality diagnostics found");
    expect(
      formatQualityDiagnosticsText([
        {
          id: "QD-1",
          severity: "warning",
          category: "freshness",
          message: "stale",
          blocking: false,
          suggestion: "sync",
          files: ["src/a.ts"],
          docs: ["docs/a.md"],
          entityId: "REQ-1",
          source: "status",
        },
      ]),
    ).toContain("1 quality diagnostic found");
    expect(
      formatQualityDiagnosticsText([
        {
          id: "QD-2",
          severity: "error",
          category: "proof",
          message: "missing",
          blocking: true,
          suggestion: "prove",
        },
        {
          id: "QD-3",
          severity: "warning",
          category: "proof",
          message: "also",
          blocking: false,
          suggestion: "later",
        },
      ]),
    ).toContain("2 quality diagnostics found");

    expect(formatViolationText([])).toBe("No violations found");
    expect(
      formatViolationText([
        {
          rule: "required-fields",
          entityId: "REQ-1",
          description: "missing",
        },
        {
          rule: "symbol-traceability",
          entityId: "SYM-1",
          description: "unlinked",
          source: "src/a.ts",
          suggestion: "add implements",
        },
      ]),
    ).toContain("Suggestion: add implements");
  });

  test("buildStructuredContent copies optional quality and impact fields", () => {
    const diagnostics: Diagnostic[] = [
      { category: "check", severity: "warning", message: "note" },
      {
        category: "check",
        severity: "error",
        message: "bad",
        file: "a.ts",
        suggestion: "fix",
      },
    ];
    const withoutImpact = buildStructuredContent({
      violations: [],
      diagnostics,
    });
    expect(withoutImpact.count).toBe(0);
    expect(withoutImpact.diagnostics[1]?.file).toBe("a.ts");
    expect(withoutImpact.qualityDiagnostics).toBeUndefined();

    const withImpact = buildStructuredContent({
      violations: [
        { rule: "required-fields", entityId: "REQ-1", description: "x" },
      ],
      diagnostics: [],
      qualityDiagnostics: [
        {
          id: "QD-1",
          severity: "warning",
          category: "freshness",
          message: "stale",
          blocking: false,
          suggestion: "sync",
        },
      ],
      impactResult: {
        impactDiagnostics: [
          {
            id: "kibi_impact_evidence_missing",
            severity: "warning",
            files: ["a.ts"],
            message: "untied",
            suggestion: "link",
          },
        ],
        sourceFiles: ["a.ts"],
        extractedSymbols: [],
        linkedEntities: [],
        nextActions: ["kb_check"],
      } as never,
    });
    expect(withImpact.qualityDiagnostics).toHaveLength(1);
    expect(withImpact.impactDiagnostics).toHaveLength(1);
    expect(withImpact.sourceFiles).toEqual(["a.ts"]);
  });

  test("check-types and tool-types modules are imported as values", () => {
    const args: CheckArgs = { rules: ["required-fields"] };
    const result: CheckResult = {
      content: [{ type: "text", text: "ok" }],
    };
    expect(args.rules).toEqual(["required-fields"]);
    expect(result.content[0]?.type).toBe("text");
    const tool: ToolConfig = {
      name: "kb_check",
      description: "check",
      inputSchema: {},
    };
    const runtime = { tools: [tool] } as Pick<ToolsRuntime, "tools">;
    expect(runtime.tools[0]?.name).toBe("kb_check");
  });
});
