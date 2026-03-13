import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCheck } from "../../src/tools/check.js";

describe("MCP check aggregated path", () => {
  test("should use aggregated checks for filtered rules", async () => {
    const query = mock(async (goal: string) => {
      if (goal.includes("check_required_fields")) {
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify([
              {
                rule: "required-fields",
                entityId: "REQ-001",
                description: "Missing required field: source",
                suggestion: "Add source to entity definition",
                source: "requirements/REQ-001.md",
              },
            ]),
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

    expect(query).toHaveBeenCalledTimes(1);
    const firstCallGoal = (query as unknown as { mock: { calls: string[][] } })
      .mock.calls[0]?.[0];
    expect(firstCallGoal).toContain("check_required_fields");
  });
});
