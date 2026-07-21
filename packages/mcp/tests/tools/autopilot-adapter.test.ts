import { describe, expect, test } from "bun:test";

import { autopilotGenerateSpec } from "kibi-cli/operations";
import { handleKbAutopilotGenerate } from "../../src/tools/autopilot-generate.js";

describe("autopilot MCP adapter", () => {
  test("delegates to the shared executor without changing the wire result", async () => {
    // Given: one exact input and a port-backed cold-start context.
    const input = {
      includeGenericMarkdown: false,
      bootstrapContext: { projectSummary: "Adapter parity" },
    };
    const context = {
      workspaceRoot: "/workspace/autopilot-adapter",
      signal: new AbortController().signal,
      clock: () => new Date(0),
      fs: {
        readFile: async () => {
          throw new Error("missing");
        },
        writeFile: async () => undefined,
        mkdir: async () => undefined,
        stat: async () => {
          throw new Error("missing");
        },
        glob: async () => [],
      },
      git: {
        revParse: async () => "develop",
        showToplevel: async () => "/workspace/autopilot-adapter",
        ignoredPaths: async () => [],
      },
    };

    // When: MCP and shared surfaces execute the same request.
    const [adapter, shared] = await Promise.all([
      handleKbAutopilotGenerate(input, context),
      autopilotGenerateSpec.execute(input, context),
    ]);

    // Then: the adapter preserves the shared result exactly.
    expect(JSON.stringify(adapter)).toBe(JSON.stringify(shared));
  });
});
