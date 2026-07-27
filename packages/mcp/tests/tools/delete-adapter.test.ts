import { describe, expect, mock, test } from "bun:test";
import { deleteSpec } from "kibi-cli/operations";
import { PrologProcess } from "kibi-cli/prolog";

import { handleKbDelete } from "../../src/tools/delete.js";
import { createMutationContext } from "../../src/tools/mutation-context.js";

type PrologResult = {
  readonly success: boolean;
  readonly bindings: Record<string, string>;
  readonly error?: string;
};

function createProlog(): PrologProcess {
  const prolog = new PrologProcess();
  prolog.query = mock(
    async (goal: string | string[]): Promise<PrologResult> => {
      if (Array.isArray(goal)) {
        return { success: false, bindings: {}, error: "unexpected batch" };
      }
      if (goal.startsWith("once(kb_entity(")) {
        return { success: true, bindings: {} };
      }
      if (goal.includes("Dependents")) {
        return { success: true, bindings: { Dependents: "[]" } };
      }
      if (goal.includes("findall(['REQ-ADAPTER',Type,Props]")) {
        return {
          success: true,
          bindings: {
            Results:
              "[['REQ-ADAPTER',req,[id='REQ-ADAPTER',title=\"Adapter delete\"]]]",
          },
        };
      }
      if (goal.startsWith("rdf_transaction(")) {
        return { success: true, bindings: {} };
      }
      if (goal === "kb_save") {
        return { success: true, bindings: {} };
      }
      return { success: false, bindings: {}, error: "unexpected mutation" };
    },
  );
  prolog.invalidateCache = mock(() => undefined);
  return prolog;
}

describe("MCP delete thin adapter", () => {
  test("delegates to the shared delete executor", async () => {
    // Given
    const args = { ids: ["REQ-ADAPTER"] };
    const sharedProlog = createProlog();
    const adapterProlog = createProlog();

    // When
    const shared = await deleteSpec.execute(
      args,
      createMutationContext(sharedProlog),
    );
    const adapter = await handleKbDelete(adapterProlog, args);

    // Then
    expect(JSON.stringify(adapter.structuredContent)).toBe(
      JSON.stringify(shared.structuredContent),
    );
    expect(JSON.stringify(adapter.content)).toBe(
      JSON.stringify(shared.content),
    );
  });
});
