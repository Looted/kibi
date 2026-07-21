import { describe, expect, test } from "bun:test";

import { semanticAdvisorSpec } from "kibi-cli/operations";
import { handleKbSemanticAdvisor } from "../../src/tools/semantic-advisor.js";

describe("semantic advisor MCP adapter", () => {
  test("delegates to the shared executor without changing the wire result", async () => {
    // Given: one exact public input and a Prolog-free operation context.
    const input = {
      text: "Only instructors can access coach features.",
      id: "REQ-COACH",
    };
    const context = {
      workspaceRoot: "/tmp/semantic-advisor-adapter",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };

    // When: MCP and shared surfaces execute the same input.
    const [adapter, shared] = await Promise.all([
      handleKbSemanticAdvisor(input),
      semanticAdvisorSpec.execute(input, context),
    ]);

    // Then: the MCP adapter preserves the shared semantic result exactly.
    expect(JSON.stringify(adapter)).toBe(JSON.stringify(shared));
  });
});
