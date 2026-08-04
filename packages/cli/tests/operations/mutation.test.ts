import { describe, expect, mock, test } from "bun:test";

import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  deleteSpec,
  upsertSpec,
  validateUpsertSpec,
} from "../../src/public/operations/specs/mutation.js";

type QueryHandler = (goal: string) => PrologQueryResult;

function createContext(handler: QueryHandler): {
  readonly context: OperationContext;
  readonly query: ReturnType<typeof mock>;
  readonly save: ReturnType<typeof mock>;
} {
  const query = mock(async (goal: string) => handler(goal));
  const save = mock(async () => ({ success: true, bindings: {} }));
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save,
  };
  return {
    context: {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date("2026-07-21T12:00:00.000Z"),
      prolog,
    },
    query,
    save,
  };
}

const payload = {
  type: "req",
  id: "REQ-MUTATION-SHARED",
  properties: {
    title: "Shared mutation executor",
    status: "open",
    source: "test://mutation/shared",
  },
} as const;

describe("shared mutation operation specs", () => {
  test("validate-upsert returns a normalized preview without mutation", async () => {
    // Given
    const { context, query, save } = createContext(() => ({
      success: false,
      bindings: {},
    }));

    // When
    const result = await validateUpsertSpec.execute(payload, context);

    // Then
    expect(result.structuredContent).toMatchObject({
      valid: true,
      errors: [],
      normalizedPreview: {
        id: payload.id,
        type: payload.type,
        title: payload.properties.title,
        status: payload.properties.status,
      },
    });
    expect(query).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test("validate-upsert rejects logical claim provenance with a mismatched stable key", async () => {
    const { context, query, save } = createContext(() => ({
      success: false,
      bindings: {},
    }));

    const result = await validateUpsertSpec.execute(
      {
        type: "fact",
        id: "FACT-MISMATCHED-CLAIM",
        properties: {
          title: "Mismatched claim",
          status: "active",
          source: "test://mutation/claim",
          fact_kind: "predicate",
          predicate_name: "dependency_rule",
          predicate_args: ["checkout", "payment", "submission"],
          canonical_key: "dependency_rule(checkout,payment,submission)",
          polarity: "assert",
          claim_key: "CLAIM-AAAAAAAAAAAAAAAA",
          claim_text: "Checkout requires payment before submission.",
        },
      },
      context,
    );

    expect(result.structuredContent).toMatchObject({
      valid: false,
      errors: [
        expect.stringContaining(
          "claim_key must equal the stable key derived from claim_text",
        ),
      ],
    });
    expect(query).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  test("upsert persists through the Prolog save port after one atomic write", async () => {
    // Given
    const { context, query, save } = createContext(
      (goal): PrologQueryResult => {
        if (goal.startsWith("once(kb_entity(")) {
          return { success: false, bindings: {} };
        }
        return { success: true, bindings: {} };
      },
    );

    // When
    const result = await upsertSpec.execute(payload, context);

    // Then
    expect(result.structuredContent).toMatchObject({
      created: 1,
      updated: 0,
      relationships_created: 0,
    });
    expect(
      query.mock.calls.filter(([goal]) =>
        String(goal).startsWith("rdf_transaction"),
      ),
    ).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("upsert does not save when its atomic write fails", async () => {
    // Given
    const { context, save } = createContext((goal) => {
      if (goal.startsWith("rdf_transaction")) {
        return {
          success: false,
          bindings: {},
          error: "relationship 2 failed",
        };
      }
      return { success: false, bindings: {} };
    });

    // When
    const invocation = upsertSpec.execute(
      {
        ...payload,
        relationships: [
          { type: "relates_to", from: payload.id, to: "REQ-FIRST" },
          { type: "relates_to", from: payload.id, to: "REQ-SECOND" },
        ],
      },
      context,
    );

    // Then
    await expect(invocation).rejects.toThrow("relationship 2 failed");
    expect(save).not.toHaveBeenCalled();
  });

  test("delete classifies mixed existing and missing ids", async () => {
    // Given
    const { context, query, save } = createContext(
      (goal): PrologQueryResult => {
        if (goal === "once(kb_entity('REQ-DELETE', _, _))") {
          return { success: true, bindings: {} };
        }
        if (goal === "once(kb_entity('REQ-MISSING', _, _))") {
          return { success: false, bindings: {} };
        }
        if (goal.includes("Dependents")) {
          return { success: true, bindings: { Dependents: "[]" } };
        }
        if (goal.includes("findall(['REQ-DELETE',Type,Props]")) {
          return {
            success: true,
            bindings: {
              Results:
                "[['REQ-DELETE',req,[id='REQ-DELETE',title=\"Delete me\",source=\"test://delete\"]]]",
            },
          };
        }
        if (goal.startsWith("rdf_transaction((kb_retract_entity(")) {
          return { success: true, bindings: {} };
        }
        throw new Error(`Unexpected goal: ${goal}`);
      },
    );

    // When
    const result = await deleteSpec.execute(
      { ids: ["REQ-DELETE", "REQ-MISSING"] },
      context,
    );

    // Then
    expect(result.structuredContent).toEqual({
      deleted: 1,
      skipped: 1,
      errors: ["Entity REQ-MISSING does not exist"],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("kb_retract_entity('REQ-DELETE', req"),
    );
    expect(save).not.toHaveBeenCalled();
  });

  test("delete skips an entity referenced by a dependent", async () => {
    // Given
    const { context, query } = createContext((goal): PrologQueryResult => {
      if (goal.startsWith("once(kb_entity(")) {
        return { success: true, bindings: {} };
      }
      if (goal.includes("Dependents")) {
        return {
          success: true,
          bindings: { Dependents: "[[verified_by,'TEST-001']]" },
        };
      }
      throw new Error(`Unexpected goal: ${goal}`);
    });

    // When
    const result = await deleteSpec.execute({ ids: ["REQ-BLOCKED"] }, context);

    // Then
    expect(result.structuredContent).toEqual({
      deleted: 0,
      skipped: 1,
      errors: [
        "Cannot delete entity REQ-BLOCKED: has dependents (other entities reference it)",
      ],
    });
    expect(
      query.mock.calls.some(([goal]) =>
        String(goal).includes("kb_retract_entity"),
      ),
    ).toBe(false);
  });

  test("delete keeps mutation and save in one rollback-safe transaction", async () => {
    // Given
    const { context, query, save } = createContext(
      (goal): PrologQueryResult => {
        if (goal.startsWith("once(kb_entity(")) {
          return { success: true, bindings: {} };
        }
        if (goal.includes("Dependents")) {
          return { success: true, bindings: { Dependents: "[]" } };
        }
        if (goal.includes("findall(['REQ-SAVE-FAIL',Type,Props]")) {
          return {
            success: true,
            bindings: {
              Results:
                "[['REQ-SAVE-FAIL',req,[id='REQ-SAVE-FAIL',title=\"Rollback\"]]]",
            },
          };
        }
        if (goal.startsWith("rdf_transaction(")) {
          return { success: false, bindings: {}, error: "disk full" };
        }
        throw new Error(`Unexpected goal: ${goal}`);
      },
    );

    // When
    const invocation = deleteSpec.execute({ ids: ["REQ-SAVE-FAIL"] }, context);

    // Then
    await expect(invocation).rejects.toThrow(
      "Delete execution failed: Failed to save KB after delete: disk full",
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/^rdf_transaction\(\(.*kb_save\)\)$/),
    );
    expect(save).not.toHaveBeenCalled();
  });
});
