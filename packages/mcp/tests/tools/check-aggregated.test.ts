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
    expect(result.content[0]?.text).toContain("Add source to entity definition");

    expect(query).toHaveBeenCalledTimes(1);
    const firstCallGoal = (query as unknown as { mock: { calls: string[][] } })
      .mock.calls[0]?.[0];
    expect(firstCallGoal).toContain("check_all_json_with_options");
  });
});
