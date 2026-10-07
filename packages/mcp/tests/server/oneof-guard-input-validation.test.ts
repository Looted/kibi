// implements REQ-mcp-oneof-guard-input-validation
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { jsonSchemaToZod } from "../../src/server/json-schema-to-zod.js";
import { TOOLS } from "../../src/tools-config.js";

// MCP validates arguments with the zod schema converted from the published
// inputSchema. A oneOf of required/not guard branches must be enforced the
// way the CLI's ajv enforces it: exactly one branch matches.
function toolInput(name: string) {
  const tool = TOOLS.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`${name} is not registered`);
  return jsonSchemaToZod(tool.inputSchema);
}

const HASH = "a".repeat(64);
const PLAN = { schemaVersion: "kibi.bootstrap-plan.v1" };

function oneOfIssue(result: { success: boolean; error?: unknown }) {
  return (
    !result.success &&
    String(JSON.stringify(result.error)).includes(
      "Input must match exactly one of",
    )
  );
}

describe("oneOf guard branches over MCP", () => {
  test("kb_apply_plan rejects a plan without approvedPlanHash at input validation", () => {
    const result = toolInput("kb_apply_plan").safeParse({
      plan: PLAN,
      async: true,
    });
    expect(oneOfIssue(result)).toBe(true);
    expect(String(JSON.stringify(result.error))).toContain(
      "{plan, approvedPlanHash}",
    );
  });

  test("kb_apply_plan accepts a plan with approvedPlanHash", () => {
    expect(
      toolInput("kb_apply_plan").safeParse({
        plan: PLAN,
        approvedPlanHash: HASH,
      }).success,
    ).toBe(true);
  });

  test("kb_apply_plan accepts recoveryJournalId alone", () => {
    expect(
      toolInput("kb_apply_plan").safeParse({ recoveryJournalId: "journal-1" })
        .success,
    ).toBe(true);
  });

  test("kb_apply_plan rejects recoveryJournalId mixed with a plan", () => {
    const result = toolInput("kb_apply_plan").safeParse({
      plan: PLAN,
      approvedPlanHash: HASH,
      recoveryJournalId: "journal-1",
    });
    expect(oneOfIssue(result)).toBe(true);
  });

  test("kb_apply_plan rejects an empty call", () => {
    expect(oneOfIssue(toolInput("kb_apply_plan").safeParse({}))).toBe(true);
  });

  test("kb_delete requires exactly one of ids or relationships", () => {
    const input = toolInput("kb_delete");
    expect(input.safeParse({ ids: ["REQ-a"] }).success).toBe(true);
    expect(oneOfIssue(input.safeParse({}))).toBe(true);
    expect(
      oneOfIssue(
        input.safeParse({
          ids: ["REQ-a"],
          relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-b" }],
        }),
      ),
    ).toBe(true);
  });

  test("a oneOf with property-bearing branches is not enforced as a guard", () => {
    const schema = jsonSchemaToZod({
      type: "object",
      oneOf: [
        { required: ["a"], properties: { a: { type: "string" } } },
        { required: ["b"] },
      ],
      properties: { a: { type: "string" }, b: { type: "string" } },
    });
    expect(schema.safeParse({ a: "x", b: "y" }).success).toBe(true);
  });

  test("the published input schema does not gain a top-level oneOf", () => {
    const tool = TOOLS.find((candidate) => candidate.name === "kb_apply_plan");
    const published = JSON.stringify(
      z.toJSONSchema(jsonSchemaToZod(tool?.inputSchema), { io: "input" }),
    );
    expect(published).toContain('"approvedPlanHash"');
    expect(published).not.toContain('"oneOf"');
  });
});
