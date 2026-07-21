import { describe, expect, test } from "bun:test";

import { semanticAdvisorSpec } from "../../src/public/operations/specs/semantic.js";
import { createParityWorkspace, normalizeParityValue } from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

describe("semantic advisor parity", () => {
  test("deep-matches deterministic ambiguity advice across CLI and MCP", async () => {
    // Given: equivalent workspaces and ambiguous cardinality prose.
    const [cliWorkspace, mcpWorkspace] = await Promise.all([
      createParityWorkspace(),
      createParityWorkspace(),
    ]);
    const input = {
      text: "Users may have two active sessions.",
      id: "REQ-AMBIGUOUS",
    };

    try {
      // When: both transports execute the dedicated no-Prolog operation.
      const [cli, mcp] = await Promise.all([
        runCliJsonRoute(cliWorkspace.root, semanticAdvisorSpec.cliName, input),
        runMCPAdapter(mcpWorkspace.root, semanticAdvisorSpec.name, input),
      ]);

      // Then: normalized semantic results, including witnesses, are identical.
      const comparison = compareResults(cli, mcp, (value) =>
        normalizeParityValue(value, [cliWorkspace.root, mcpWorkspace.root]),
      );
      expect(comparison.parity, comparison.diff).toBe(true);
    } finally {
      await Promise.all([cliWorkspace.cleanup(), mcpWorkspace.cleanup()]);
    }
  }, 30_000);
});
