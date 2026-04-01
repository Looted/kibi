import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbDelete } from "../../src/tools/delete.js";

type QueryResult = {
  success: boolean;
  bindings?: Record<string, string | undefined>;
  error?: string;
};

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
      "At least one ID required for delete",
    );
  });

  test("deletes a single existing entity with no dependents and invalidates cache", async () => {
    const { prolog, query, invalidateCache } = createMockProlog(
      async (goal) => {
        if (goal === "once(kb_entity('REQ-001', _, _))") {
          return { success: true };
        }

        if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
          return { success: true, bindings: { Dependents: "[]" } };
        }

        if (goal === "kb_retract_entity('REQ-001')") {
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

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: {} };
      }

      if (goal.includes("kb_relationship") && goal.includes("'o''brien'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (
        goal === "kb_retract_entity('REQ-001')" ||
        goal === "kb_retract_entity('o''brien')"
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
    expect(query).toHaveBeenCalledWith("kb_retract_entity('o''brien')");
    expect(result.structuredContent).toEqual({
      deleted: 2,
      skipped: 0,
      errors: [],
    });
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

      if (goal.includes("kb_relationship") && goal.includes("'REQ-DELETED'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-BLOCKED'")) {
        return {
          success: true,
          bindings: { Dependents: "[[verified_by,'TEST-1']]" },
        };
      }

      if (goal === "kb_retract_entity('REQ-DELETED')") {
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

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal === "kb_retract_entity('REQ-001')") {
        return { success: false, error: "permission denied" };
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
      errors: ["Failed to delete entity REQ-001: permission denied"],
    });
  });

  test("wraps save failures and does not invalidate cache", async () => {
    const { prolog, invalidateCache } = createMockProlog(async (goal) => {
      if (goal === "once(kb_entity('REQ-001', _, _))") {
        return { success: true };
      }

      if (goal.includes("kb_relationship") && goal.includes("'REQ-001'")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }

      if (goal === "kb_retract_entity('REQ-001')") {
        return { success: true };
      }

      if (goal === "kb_save") {
        return { success: false };
      }

      throw new Error(`Unexpected goal: ${goal}`);
    });

    await expect(handleKbDelete(prolog, { ids: ["REQ-001"] })).rejects.toThrow(
      "Delete execution failed: Failed to save KB after delete: Unknown error",
    );
    expect(invalidateCache).not.toHaveBeenCalled();
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
