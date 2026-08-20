import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCheck } from "../../src/tools/check.js";

describe("MCP check aggregated config overrides", () => {
  test("should allow explicit strict-fact-shape opt-in even when config disables it", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-check-optin-"),
    );

    try {
      mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
      writeFileSync(
        path.join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify(
          {
            checks: {
              rules: {
                "strict-fact-shape": false,
              },
            },
          },
          null,
          2,
        ),
      );

      const query = mock(async (goal: string) => {
        if (goal.includes("check_all_json_with_options")) {
          return {
            success: true,
            bindings: {
              JsonString: JSON.stringify({
                "strict-fact-shape": [
                  {
                    rule: "strict-fact-shape",
                    entityId: "FACT-MALFORMED-OPTIN-001",
                    description:
                      "Strict fact missing required field: subject_key",
                    suggestion: "Add subject_key to the fact definition",
                    source: "facts/FACT-MALFORMED-OPTIN-001.md",
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

      const result = await handleKbCheck(prolog, {
        rules: ["strict-fact-shape"],
        workspaceRoot,
      });

      expect(result.structuredContent?.count).toBe(0);
      expect(result.structuredContent?.violations).toEqual([]);
      expect(
        result.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) =>
            diagnostic.id === "rule.strict-fact-shape" &&
            diagnostic.entityId === "FACT-MALFORMED-OPTIN-001" &&
            diagnostic.blocking === false,
        ),
      ).toBe(true);
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("should allow explicit strict-req-fact-pairing opt-in even when config disables it", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-check-pairing-optin-"),
    );

    try {
      mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
      writeFileSync(
        path.join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify(
          {
            checks: {
              rules: {
                "strict-req-fact-pairing": false,
              },
            },
          },
          null,
          2,
        ),
      );

      const query = mock(async (goal: string) => {
        if (goal.includes("check_all_json_with_options")) {
          return {
            success: true,
            bindings: {
              JsonString: JSON.stringify({
                "strict-req-fact-pairing": [
                  {
                    rule: "strict-req-fact-pairing",
                    entityId: "REQ-PAIRING-OPTIN-001",
                    description:
                      "Requirement constrains FACT-SUBJECT-001 but has no matching strict requires_property fact",
                    suggestion:
                      "Add a property_value fact via requires_property for the same subject_key",
                    source: "requirements/REQ-PAIRING-OPTIN-001.md",
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

      const result = await handleKbCheck(prolog, {
        rules: ["strict-req-fact-pairing"],
        workspaceRoot,
      });

      expect(result.structuredContent?.count).toBe(0);
      expect(result.structuredContent?.violations).toEqual([]);
      expect(
        result.structuredContent?.qualityDiagnostics?.some(
          (diagnostic) =>
            diagnostic.id === "rule.strict-req-fact-pairing" &&
            diagnostic.entityId === "REQ-PAIRING-OPTIN-001" &&
            diagnostic.blocking === false,
        ),
      ).toBe(true);
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
