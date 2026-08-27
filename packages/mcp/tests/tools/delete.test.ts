import "../helpers/ensure-test-branch.js";
import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbDelete } from "../../src/tools/delete.js";

type QueryResult = {
  success: boolean;
  bindings?: Record<string, string | undefined>;
  error?: string;
};

function entityResultsBinding(id: string, type: string, props: string): string {
  return `[['${id.replace(/'/g, "''")}',${type},[${props}]]]`;
}

function deleteGoal(id: string, type: string, props: string): string {
  return `kb_retract_entity('${id.replace(/'/g, "''")}', ${type}, [${props}])`;
}

function createMockProlog(
  handler: (goal: string) => Promise<QueryResult> | QueryResult,
) {
  const query = mock(async (goal: string) => {
    const result = await handler(goal);
    return { bindings: {}, ...result };
  });
  const invalidateCache = mock(() => {});

  return {
    query,
    invalidateCache,
    prolog: {
      query,
      invalidateCache,
    } as unknown as PrologProcess,
  };
}

describe("handleKbDelete", () => {
  test("throws when ids array is empty", async () => {
    const { prolog } = createMockProlog(async () => ({ success: true }));

    await expect(handleKbDelete(prolog, { ids: [] })).rejects.toThrow(
      "Delete requires exactly one non-empty input: ids or relationships",
    );
  });

  test("deletes a single existing entity with no dependents and invalidates cache", async () => {
    const { prolog, query, invalidateCache } = createMockProlog(
      async (goal) => {
        if (goal === "once(kb_entity('REQ-001', _, _))") {
          return { success: true };
        }

        if (
          goal ===
          "findall(['REQ-001',Type,Props], kb_entity('REQ-001', Type, Props), Results)"
        ) {
          return {
            success: true,
            bindings: {
              Results: entityResultsBinding(
                "REQ-001",
                "req",
                `id='REQ-001', title=\"Delete me\", source=\"test://delete\", text_ref=\"docs/REQ-001.md#L1\"`,
              ),
            },
          };
        }

        if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
          if (goal.includes("Relationships")) {
            return { success: true, bindings: { Relationships: "[]" } };
          }
          return { success: true, bindings: { Dependents: "[]" } };
        }

        if (
          goal.startsWith("rdf_transaction(") &&
          goal.includes(
            deleteGoal(
              "REQ-001",
              "req",
              `id='REQ-001', title=\"Delete me\", source=\"test://delete\", text_ref=\"docs/REQ-001.md#L1\"`,
            ),
          )
        ) {
          return { success: true };
        }

        if (goal === "kb_save") {
          return { success: true };
        }

        throw new Error(`Unexpected goal: ${goal}`);
      },
    );

    const result = await handleKbDelete(prolog, { ids: ["REQ-001"] });

    expect(query).toHaveBeenCalledTimes(4);
    expect(invalidateCache).toHaveBeenCalledTimes(1);
    expect(result.structuredContent).toEqual({
      deleted: 1,
      skipped: 0,
      errors: [],
    });
    expect(result.content[0]?.text).toContain("Deleted 1 entities. Skipped 0.");
    expect(result.content[0]?.text).not.toContain("Errors:");
  });

  test("deletes multiple entities successfully and escapes quoted ids", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (
        goal === "once(kb_entity('REQ-001', _, _))" ||
        goal === "once(kb_entity('o''brien', _, _))"
      ) {
        return { success: true };
      }

      if (
        goal ===
        "findall(['REQ-001',Type,Props], kb_entity('REQ-001', Type, Props), Results)"
      ) {
        return {
          success: true,
          bindings: {
            Results: entityResultsBinding(
              "REQ-001",
              "req",
              `id='REQ-001', title=\"Delete req\", source=\"test://delete\"`,
            ),
          },
        };
      }

      if (
        goal ===
        "findall(['o''brien',Type,Props], kb_entity('o''brien', Type, Props), Results)"
      ) {
        return {
          success: true,
          bindings: {
            Results: entityResultsBinding(
              "o'brien",
              "req",
              `id='o''brien', title=\"Delete quoted\", source=\"test://delete\"`,
            ),
          },
        };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: {} };
      }

      if (goal.includes("kb_relationship") && goal.includes("'o''brien'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (
        goal.startsWith("rdf_transaction(") &&
        goal.includes(
          deleteGoal(
            "REQ-001",
            "req",
            `id='REQ-001', title=\"Delete req\", source=\"test://delete\"`,
          ),
        ) &&
        goal.includes(
          deleteGoal(
            "o'brien",
            "req",
            `id='o''brien', title=\"Delete quoted\", source=\"test://delete\"`,
          ),
        )
      ) {
        return { success: true };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbDelete(prolog, {
      ids: ["REQ-001", "o'brien"],
    });

    expect(query).toHaveBeenCalledWith("once(kb_entity('o''brien', _, _))");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        deleteGoal(
          "o'brien",
          "req",
          `id='o''brien', title=\"Delete quoted\", source=\"test://delete\"`,
        ),
      ),
    );
    expect(result.structuredContent).toEqual({
      deleted: 2,
      skipped: 0,
      errors: [],
    });
  });

  test("preserves delete metadata even when optional fields are absent", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-MINIMAL', _, _))") {
        return { success: true };
      }

      if (
        goal ===
        "findall(['REQ-MINIMAL',Type,Props], kb_entity('REQ-MINIMAL', Type, Props), Results)"
      ) {
        return {
          success: true,
          bindings: {
            Results: entityResultsBinding(
              "REQ-MINIMAL",
              "req",
              `id='REQ-MINIMAL', title=\"Minimal delete\"`,
            ),
          },
        };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-MINIMAL'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (
        goal.startsWith("rdf_transaction(") &&
        goal.includes(
          deleteGoal(
            "REQ-MINIMAL",
            "req",
            `id='REQ-MINIMAL', title=\"Minimal delete\"`,
          ),
        )
      ) {
        return { success: true };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await handleKbDelete(prolog, { ids: ["REQ-MINIMAL"] });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        deleteGoal(
          "REQ-MINIMAL",
          "req",
          `id='REQ-MINIMAL', title=\"Minimal delete\"`,
        ),
      ),
    );
  });

  test("skips entities that do not exist", async () => {
    const { prolog, query } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-404', _, _))") {
        return { success: false };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbDelete(prolog, { ids: ["REQ-404"] });

    expect(query).toHaveBeenCalledTimes(2);
    expect(result.structuredContent).toEqual({
      deleted: 0,
      skipped: 1,
      errors: ["Entity REQ-404 does not exist"],
    });
  });

  test("skips entities that still have dependents", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        return { success: true };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return {
          success: true,
          bindings: { Dependents: "[[depends_on,'REQ-002']]" },
        };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbDelete(prolog, { ids: ["REQ-001"] });

    expect(result.structuredContent).toEqual({
      deleted: 0,
      skipped: 1,
      errors: [
        "Cannot delete entity REQ-001: has dependents (other entities reference it)",
      ],
    });
  });

  test("returns correct counts and aggregated errors for mixed results", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (
        goal === "once(kb_entity('REQ-DELETED', _, _))" ||
        goal === "once(kb_entity('REQ-BLOCKED', _, _))"
      ) {
        return { success: true };
      }

      if (goal === "once(kb_entity('REQ-MISSING', _, _))") {
        return { success: false };
      }

      if (
        goal ===
        "findall(['REQ-DELETED',Type,Props], kb_entity('REQ-DELETED', Type, Props), Results)"
      ) {
        return {
          success: true,
          bindings: {
            Results: entityResultsBinding(
              "REQ-DELETED",
              "req",
              `id='REQ-DELETED', title=\"Delete success\", source=\"test://delete\"`,
            ),
          },
        };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-DELETED'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-BLOCKED'")) {
        return {
          success: true,
          bindings: { Dependents: "[[verified_by,'TEST-1']]" },
        };
      }

      if (
        goal.startsWith("rdf_transaction(") &&
        goal.includes(
          deleteGoal(
            "REQ-DELETED",
            "req",
            `id='REQ-DELETED', title=\"Delete success\", source=\"test://delete\"`,
          ),
        )
      ) {
        return { success: true };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbDelete(prolog, {
      ids: ["REQ-DELETED", "REQ-BLOCKED", "REQ-MISSING"],
    });

    expect(result.structuredContent).toEqual({
      deleted: 1,
      skipped: 2,
      errors: [
        "Cannot delete entity REQ-BLOCKED: has dependents (other entities reference it)",
        "Entity REQ-MISSING does not exist",
      ],
    });
    expect(result.content[0]?.text).toContain("Deleted 1 entities. Skipped 2.");
    expect(result.content[0]?.text).toContain(
      "Errors: Cannot delete entity REQ-BLOCKED: has dependents (other entities reference it); Entity REQ-MISSING does not exist",
    );
  });

  test("reports dependent inspection query failures", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        return { success: true };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: false };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    const result = await handleKbDelete(prolog, { ids: ["REQ-001"] });

    expect(result.structuredContent).toEqual({
      deleted: 0,
      skipped: 1,
      errors: ["Failed to inspect dependents for entity REQ-001: Query failed"],
    });
  });

  test("reports delete query failures", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        return { success: true };
      }

      if (
        goal ===
        "findall(['REQ-001',Type,Props], kb_entity('REQ-001', Type, Props), Results)"
      ) {
        return {
          success: true,
          bindings: {
            Results: entityResultsBinding(
              "REQ-001",
              "req",
              `id='REQ-001', title=\"Delete failure\", source=\"test://delete\"`,
            ),
          },
        };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal.startsWith("rdf_transaction(")) {
        return { success: false, error: "permission denied" };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(handleKbDelete(prolog, { ids: ["REQ-001"] })).rejects.toThrow(
      "Delete execution failed: Failed to save KB after delete: permission denied",
    );
  });

  test("wraps save failures and does not invalidate cache", async () => {
    const { prolog, invalidateCache } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        return { success: true };
      }

      if (
        goal ===
        "findall(['REQ-001',Type,Props], kb_entity('REQ-001', Type, Props), Results)"
      ) {
        return {
          success: true,
          bindings: {
            Results: entityResultsBinding(
              "REQ-001",
              "req",
              `id='REQ-001', title=\"Delete save fail\", source=\"test://delete\"`,
            ),
          },
        };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal.startsWith("rdf_transaction(")) {
        return { success: false };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(handleKbDelete(prolog, { ids: ["REQ-001"] })).rejects.toThrow(
      "Delete execution failed: Failed to save KB after delete: Unknown error",
    );
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  test("reports metadata lookup query failure", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        return { success: true };
      }

      if (
        goal ===
        "findall(['REQ-001',Type,Props], kb_entity('REQ-001', Type, Props), Results)"
      ) {
        return { success: false, error: "query engine crash" };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(handleKbDelete(prolog, { ids: ["REQ-001"] })).rejects.toThrow(
      "Delete execution failed: Failed to load metadata for entity REQ-001: query engine crash",
    );
  });

  test("reports empty metadata rows", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        return { success: true };
      }

      if (
        goal ===
        "findall(['REQ-001',Type,Props], kb_entity('REQ-001', Type, Props), Results)"
      ) {
        return { success: true, bindings: { Results: "[]" } };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal === "kb_save") {
        return { success: true };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(handleKbDelete(prolog, { ids: ["REQ-001"] })).rejects.toThrow(
      "Delete execution failed: Failed to load metadata for entity REQ-001: Entity not found",
    );
  });

  test("wraps thrown non-Error values from the query layer", async () => {
    const { prolog } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        throw "catastrophic failure";
      }

      return { success: true };
    });

    await expect(handleKbDelete(prolog, { ids: ["REQ-001"] })).rejects.toThrow(
      "Delete execution failed: catastrophic failure",
    );
  });
});
