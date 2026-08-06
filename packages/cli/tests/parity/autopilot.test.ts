import { describe, expect, test } from "bun:test";

import { autopilotGenerateSpec } from "../../src/public/operations/specs/autopilot.js";
import { createParityWorkspace, normalizeParityValue } from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

describe("autopilot parity", () => {
  test("deep-matches nested bootstrap synthesis across CLI JSON and MCP", async () => {
    // Given: equivalent cold-start workspaces and nested declared context.
    const [cliWorkspace, mcpWorkspace] = await Promise.all([
      createParityWorkspace(),
      createParityWorkspace(),
    ]);
    const input = {
      includeGenericMarkdown: false,
      minConfidence: 0.8,
      maxCandidates: 3,
      bootstrapContext: {
        projectSummary: "Parity fixture",
        sourceOfTruthPaths: ["README.md"],
        verificationAnchors: ["bun test"],
      },
    };

    try {
      // When: both transports execute the public JSON contract.
      const [cli, mcp] = await Promise.all([
        runCliJsonRoute(
          cliWorkspace.root,
          autopilotGenerateSpec.cliName,
          input,
        ),
        runMCPAdapter(mcpWorkspace.root, autopilotGenerateSpec.name, input),
      ]);

      // Then: normalized structured outputs are identical.
      const comparison = compareResults(cli, mcp, (value) =>
        normalizeParityValue(value, [cliWorkspace.root, mcpWorkspace.root]),
      );
      expect(comparison.parity, comparison.diff).toBe(true);
    } finally {
      await Promise.all([cliWorkspace.cleanup(), mcpWorkspace.cleanup()]);
    }
  }, 30_000);
});
