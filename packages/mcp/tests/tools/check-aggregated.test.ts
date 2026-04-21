import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCheck } from "../../src/tools/check.js";

describe("MCP check aggregated path", () => {
  test("should use aggregated checks for filtered rules", async () => {
    const query = mock(async (goal: string) => {
      if (goal.includes("check_all_json_with_options")) {
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify({
              "required-fields": [
                {
                  rule: "required-fields",
                  entityId: "REQ-001",
                  description: "Missing required field: source",
                  suggestion: "Add source to entity definition",
                  source: "requirements/REQ-001.md",
                },
              ],
              "symbol-traceability": [
                {
                  rule: "symbol-traceability",
                  entityId: "SYM-001",
                  description: "Missing requirement link",
                  suggestion: "Add implements REQ-001",
                  source: "src/symbol.ts",
                },
              ],
            }),
          },
        };
      }

      throw new Error(`Unexpected query: ${goal}`);
    });

    const prolog = { query } as unknown as PrologProcess;

    const result = await handleKbCheck(prolog, {
      rules: ["required-fields"],
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.violations[0]?.rule).toBe(
      "required-fields",
    );
    expect(result.content[0]?.text).toContain("required-fields");
    expect(result.content[0]?.text).toContain("REQ-001");
    expect(result.content[0]?.text).toContain("requirements/REQ-001.md");
    expect(result.content[0]?.text).toContain(
      "Add source to entity definition",
    );

    expect(query).toHaveBeenCalledTimes(1);
    const firstCallGoal = (query as unknown as { mock: { calls: string[][] } })
      .mock.calls[0]?.[0];
    expect(firstCallGoal).toContain("check_all_json_with_options");
  });

  test("should include strict-fact-shape violations when returned from aggregated checks", async () => {
    const query = mock(async (goal: string) => {
      if (goal.includes("check_all_json_with_options")) {
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify({
              "strict-fact-shape": [
                {
                  rule: "strict-fact-shape",
                  entityId: "FACT-MALFORMED-001",
                  description:
                    "Strict fact missing required field: subject_key",
                  suggestion: "Add subject_key to the fact definition",
                  source: "facts/FACT-MALFORMED-001.md",
                },
              ],
            }),
          },
        };
      }

      throw new Error(`Unexpected query: ${goal}`);
    });

    const prolog = { query } as unknown as PrologProcess;

    const result = await handleKbCheck(prolog, {
      rules: ["strict-fact-shape"],
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.violations[0]?.rule).toBe(
      "strict-fact-shape",
    );
    expect(result.content[0]?.text).toContain("strict-fact-shape");
    expect(result.content[0]?.text).toContain("FACT-MALFORMED-001");
  });

  test("should keep strict-fact-shape disabled by default when no rules are requested", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-check-default-"),
    );

    try {
      const query = mock(async (goal: string) => {
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

      const prolog = { query } as unknown as PrologProcess;

      const result = await handleKbCheck(prolog, { workspaceRoot });

      expect(result.structuredContent?.count).toBe(0);
      expect(result.structuredContent?.violations).toEqual([]);
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

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

      const prolog = { query } as unknown as PrologProcess;

      const result = await handleKbCheck(prolog, {
        rules: ["strict-fact-shape"],
        workspaceRoot,
      });

      expect(result.structuredContent?.count).toBe(1);
      expect(result.structuredContent?.violations[0]?.rule).toBe(
        "strict-fact-shape",
      );
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("should include strict-req-fact-pairing violations when returned from aggregated checks", async () => {
    const query = mock(async (goal: string) => {
      if (goal.includes("check_all_json_with_options")) {
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify({
              "strict-req-fact-pairing": [
                {
                  rule: "strict-req-fact-pairing",
                  entityId: "REQ-PAIRING-001",
                  description:
                    "Requirement constrains FACT-SUBJECT-001 but has no matching strict requires_property fact",
                  suggestion:
                    "Add a property_value fact via requires_property for the same subject_key",
                  source: "requirements/REQ-PAIRING-001.md",
                },
              ],
            }),
          },
        };
      }

      throw new Error(`Unexpected query: ${goal}`);
    });

    const prolog = { query } as unknown as PrologProcess;

    const result = await handleKbCheck(prolog, {
      rules: ["strict-req-fact-pairing"],
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.violations[0]?.rule).toBe(
      "strict-req-fact-pairing",
    );
    expect(result.content[0]?.text).toContain("strict-req-fact-pairing");
    expect(result.content[0]?.text).toContain("REQ-PAIRING-001");
  });

  test("should keep strict-req-fact-pairing disabled by default when no rules are requested", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-check-pairing-default-"),
    );

    try {
      const query = mock(async (goal: string) => {
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

      const prolog = { query } as unknown as PrologProcess;

      const result = await handleKbCheck(prolog, { workspaceRoot });

      expect(result.structuredContent?.count).toBe(0);
      expect(result.structuredContent?.violations).toEqual([]);
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

      const prolog = { query } as unknown as PrologProcess;

      const result = await handleKbCheck(prolog, {
        rules: ["strict-req-fact-pairing"],
        workspaceRoot,
      });

      expect(result.structuredContent?.count).toBe(1);
      expect(result.structuredContent?.violations[0]?.rule).toBe(
        "strict-req-fact-pairing",
      );
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});
