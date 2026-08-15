import { describe, expect, test } from "bun:test";

import { deleteSpec } from "../../src/public/operations/specs/mutation.js";
import { createParityWorkspace, normalizeParityValue } from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

describe("delete parity", () => {
  test("deep-matches mixed multi-id results across CLI JSON and MCP", async () => {
    // Given
    const [cliWorkspace, mcpWorkspace] = await Promise.all([
      createParityWorkspace(),
      createParityWorkspace(),
    ]);
    try {
      const upsertInput = {
        type: "req",
        id: "REQ-DELETE-PARITY",
        properties: { title: "Delete transport parity", status: "open" },
        document: { path: "requirements/REQ-DELETE-PARITY.md" },
      } as const;
      const [cliSeeded, mcpSeeded] = await Promise.all([
        runCliJsonRoute(cliWorkspace.root, "upsert", upsertInput),
        runMCPAdapter(mcpWorkspace.root, "kb_upsert", upsertInput),
      ]);
      expect(cliSeeded.exitCode, cliSeeded.stderr).toBe(0);
      expect(mcpSeeded.error).toBeUndefined();

      // When
      const [cli, mcp] = await Promise.all([
        runCliJsonRoute(cliWorkspace.root, deleteSpec.cliName, {
          ids: ["REQ-DELETE-PARITY", "REQ-MISSING"],
        }),
        runMCPAdapter(mcpWorkspace.root, deleteSpec.name, {
          ids: ["REQ-DELETE-PARITY", "REQ-MISSING"],
        }),
      ]);

      // Then
      const comparison = compareResults(cli, mcp, (value) =>
        normalizeParityValue(value, [cliWorkspace.root, mcpWorkspace.root]),
      );
      expect(comparison.parity, comparison.diff).toBe(true);
    } finally {
      await Promise.all([cliWorkspace.cleanup(), mcpWorkspace.cleanup()]);
    }
  }, 30_000);
});
