import { describe, expect, mock, test } from "bun:test";

import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
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

  test("upsert persists through the Prolog save port after one atomic write", async () => {
    // Given
    const { context, query, save } = createContext((goal) => {
      if (goal.startsWith("once(kb_entity(")) {
        return { success: false, bindings: {} };
      }
      return { success: true, bindings: {} };
    });

    // When
    const result = await upsertSpec.execute(payload, context);

    // Then
    expect(result.structuredContent).toMatchObject({
      created: 1,
      updated: 0,
      relationships_created: 0,
    });
    expect(
      query.mock.calls.filter(([goal]) => String(goal).startsWith("rdf_transaction")),
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
});
