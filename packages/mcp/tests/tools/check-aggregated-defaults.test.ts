import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { RULE_NAMES } from "kibi-cli/public/check-types";
import { handleKbCheck } from "../../src/tools/check.js";

function emptyFullQualityResult(goal: string) {
  if (goal.includes("kb_entity")) {
    return {
      success: true,
      bindings: { Results: "[]" },
    };
  }

  if (goal.includes("kb_relationship")) {
    return {
      success: true,
      bindings: { Rels: "[]" },
    };
  }

  return undefined;
}

describe("MCP check aggregated defaults", () => {
  test("should report strict-fact-shape as a quality diagnostic by default", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-check-default-"),
    );

    try {
      const query = mock(async (goal: string) => {
        const fullQualityResult = emptyFullQualityResult(goal);
        if (fullQualityResult !== undefined) {
          return fullQualityResult;
        }

        if (goal.includes("check_all_json_with_options")) {
          return {
            success: true,
            bindings: {
              JsonString: JSON.stringify({
                "strict-fact-shape": [
                  {
                    rule: "strict-fact-shape",
                    entityId: "FACT-MALFORMED-DEFAULT-001",
                    description:
                      "Strict fact missing required field: subject_key",
                    suggestion: "Add subject_key to the fact definition",
                    source: "facts/FACT-MALFORMED-DEFAULT-001.md",
                  },
                ],
              }),
            },
          };
        }

        throw new Error(`Unexpected query: ${goal}`);
      });

      const prolog = {
        query,
        invalidateCache: () => {},
      } as unknown as PrologProcess;

      const result = await handleKbCheck(prolog, { workspaceRoot });

      expect(result.structuredContent?.count).toBe(0);
      expect(result.structuredContent?.violations).toEqual([]);
      expect(
        result.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) =>
            diagnostic.id === "rule.strict-fact-shape" &&
            diagnostic.entityId === "FACT-MALFORMED-DEFAULT-001" &&
            diagnostic.blocking === false,
        ),
      ).toBe(true);
      expect(query).toHaveBeenCalledTimes(18);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("should report strict-req-fact-pairing as a quality diagnostic by default", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-check-pairing-default-"),
    );

    try {
      const query = mock(async (goal: string) => {
        const fullQualityResult = emptyFullQualityResult(goal);
        if (fullQualityResult !== undefined) {
          return fullQualityResult;
        }

        if (goal.includes("check_all_json_with_options")) {
          return {
            success: true,
            bindings: {
              JsonString: JSON.stringify({
                "strict-req-fact-pairing": [
                  {
                    rule: "strict-req-fact-pairing",
                    entityId: "REQ-PAIRING-DEFAULT-001",
                    description:
                      "Requirement constrains FACT-SUBJECT-001 but has no matching strict requires_property fact",
                    suggestion:
                      "Add a property_value fact via requires_property for the same subject_key",
                    source: "requirements/REQ-PAIRING-DEFAULT-001.md",
                  },
                ],
              }),
            },
          };
        }

        throw new Error(`Unexpected query: ${goal}`);
      });

      const prolog = {
        query,
        invalidateCache: () => {},
      } as unknown as PrologProcess;

      const result = await handleKbCheck(prolog, { workspaceRoot });

      expect(result.structuredContent?.count).toBe(0);
      expect(result.structuredContent?.violations).toEqual([]);
      expect(
        result.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) =>
            diagnostic.id === "rule.strict-req-fact-pairing" &&
            diagnostic.entityId === "REQ-PAIRING-DEFAULT-001" &&
            diagnostic.blocking === false,
        ),
      ).toBe(true);
      expect(query).toHaveBeenCalledTimes(18);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("should pass maxDiagnostics to full quality diagnostics even when leftover config disables rules", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-check-no-rules-"),
    );

    try {
      mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
      writeFileSync(
        path.join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify({
          checks: {
            rules: Object.fromEntries(
              [...RULE_NAMES].map((rule) => [rule, false]),
            ),
          },
        }),
      );
      const query = mock(async (goal: string) => {
        const fullQualityResult = emptyFullQualityResult(goal);
        if (fullQualityResult !== undefined) {
          return fullQualityResult;
        }

        if (goal.includes("check_all_json_with_options")) {
          return {
            success: true,
            bindings: {
              JsonString: JSON.stringify({}),
            },
          };
        }

        throw new Error(`Unexpected query: ${goal}`);
      });
      const prolog = {
        query,
        invalidateCache: () => {},
      } as unknown as PrologProcess;

      const result = await handleKbCheck(prolog, {
        workspaceRoot,
        maxDiagnostics: 1,
      });

      expect(result.structuredContent?.count).toBe(0);
      expect(result.structuredContent?.violations).toEqual([]);
      expect(query).toHaveBeenCalled();
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
