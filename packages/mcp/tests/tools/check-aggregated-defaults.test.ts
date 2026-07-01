import { describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
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
  test("should keep strict-fact-shape disabled by default when no rules are requested", async () => {
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
      expect(query).toHaveBeenCalledTimes(18);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("should keep strict-req-fact-pairing disabled by default when no rules are requested", async () => {
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
      expect(query).toHaveBeenCalledTimes(18);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
