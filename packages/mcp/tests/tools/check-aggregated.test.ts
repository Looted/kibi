import { describe, expect, mock, test } from "bun:test";
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

    const prolog = {
      query,
      invalidateCache: () => {},
    } as unknown as PrologProcess;

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

    expect(query.mock.calls.length).toBeGreaterThanOrEqual(1);
    const firstCallGoal = (
      query as unknown as { mock: { calls: string[][] } }
    ).mock.calls.find((call) =>
      call[0]?.includes("check_all_json_with_options"),
    )?.[0];
    expect(firstCallGoal).toContain("check_all_json_with_options");
  });

  test("should include strict-fact-shape quality diagnostics when returned from aggregated checks", async () => {
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

    const prolog = {
      query,
      invalidateCache: () => {},
    } as unknown as PrologProcess;

    const result = await handleKbCheck(prolog, {
      rules: ["strict-fact-shape"],
    });

    const diagnostic = result.structuredContent?.qualityDiagnostics?.find(
      (item) =>
        item.id === "rule.strict-fact-shape" &&
        item.entityId === "FACT-MALFORMED-001",
    );
    expect(result.structuredContent?.count).toBe(0);
    expect(result.structuredContent?.violations).toEqual([]);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.blocking).toBe(false);
    expect(result.content[0]?.text).toContain("strict-fact-shape");
    expect(result.content[0]?.text).toContain("FACT-MALFORMED-001");
  });

  test("should include strict-req-fact-pairing quality diagnostics when returned from aggregated checks", async () => {
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

    const prolog = {
      query,
      invalidateCache: () => {},
    } as unknown as PrologProcess;

    const result = await handleKbCheck(prolog, {
      rules: ["strict-req-fact-pairing"],
    });

    const diagnostic = result.structuredContent?.qualityDiagnostics?.find(
      (item) =>
        item.id === "rule.strict-req-fact-pairing" &&
        item.entityId === "REQ-PAIRING-001",
    );
    expect(result.structuredContent?.count).toBe(0);
    expect(result.structuredContent?.violations).toEqual([]);
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.blocking).toBe(false);
    expect(result.content[0]?.text).toContain("strict-req-fact-pairing");
    expect(result.content[0]?.text).toContain("REQ-PAIRING-001");
  });

  test("should include domain-contradictions violations from aggregated checks", async () => {
    const query = mock(async (goal: string) => {
      if (goal.includes("check_all_json_with_options")) {
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify({
              "domain-contradictions": [
                {
                  rule: "domain-contradictions",
                  entityId: "REQ-DOMAIN-CLOSED-001/REQ-DOMAIN-OPEN-001",
                  description:
                    "Value conflict on session.closed.timeout_minutes: eq 30 vs eq 60",
                  suggestion:
                    "Supersede one requirement or align both to the same required property",
                  source: "",
                  evidence: {
                    witnesses: [
                      {
                        kind: "strict_property",
                        status: "contradiction",
                        requirements: [
                          "REQ-DOMAIN-CLOSED-001",
                          "REQ-DOMAIN-OPEN-001",
                        ],
                      },
                    ],
                  },
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
      rules: ["domain-contradictions"],
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.violations[0]?.rule).toBe(
      "domain-contradictions",
    );
    expect(result.structuredContent?.violations[0]?.evidence).toEqual({
      witnesses: [
        {
          kind: "strict_property",
          status: "contradiction",
          requirements: ["REQ-DOMAIN-CLOSED-001", "REQ-DOMAIN-OPEN-001"],
        },
      ],
    });
    expect(result.content[0]?.text).toContain("domain-contradictions");
    expect(result.content[0]?.text).toContain("REQ-DOMAIN-CLOSED-001");
    expect(result.content[0]?.text).toContain("timeout_minutes");
  });
});
