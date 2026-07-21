import { describe, expect, test } from "bun:test";

import { semanticAdvisorSpec } from "../../src/public/operations/specs/semantic.js";

describe("semantic advisor operation", () => {
  test("returns deterministic strict-property advice without Prolog", async () => {
    // Given: exact MCP-shaped input and a context with no Prolog capability.
    const input = {
      text: "Users may have at most two active sessions.",
      type: "req",
      id: "REQ-SESSIONS",
      title: "Limit active sessions",
      source: "docs/requirements/sessions.md",
    };
    const context = {
      workspaceRoot: "/tmp/semantic-advisor",
      signal: new AbortController().signal,
      clock: () => new Date(0),
    };

    // When: the public operation executes twice.
    const first = await semanticAdvisorSpec.execute(input, context);
    const second = await semanticAdvisorSpec.execute(input, context);

    // Then: the output is stable and contains the established strict claim.
    expect(first).toEqual(second);
    expect(first.structuredContent).toMatchObject({
      receipt: {
        suggestions: [
          {
            kind: "strict_property",
            claim: {
              subject_key: "user.session",
              property_key: "active_count",
              operator: "lte",
              value_int: 2,
            },
          },
        ],
      },
    });
    expect(semanticAdvisorSpec.requiresProlog).toBe(false);
  });
});
