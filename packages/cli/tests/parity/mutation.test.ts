import { describe, expect, test } from "bun:test";

import {
  upsertSpec,
  validateUpsertSpec,
} from "../../src/public/operations/specs/mutation.js";
import { createParityWorkspace, normalizeParityValue } from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

const input = {
  type: "req",
  id: "REQ-MUTATION-PARITY",
  properties: {
    title: "Mutation transport parity",
    status: "open",
    source: "test://mutation/parity",
  },
} as const;

describe("mutation parity", () => {
  test.each([
    [validateUpsertSpec, "validate-upsert"],
    [upsertSpec, "upsert"],
  ] as const)(
    "%s deep-matches across CLI JSON and MCP",
    async (spec) => {
      // Given
      const [cliWorkspace, mcpWorkspace] = await Promise.all([
        createParityWorkspace(),
        createParityWorkspace(),
      ]);

      try {
        // When
        const [cli, mcp] = await Promise.all([
          runCliJsonRoute(cliWorkspace.root, spec.cliName, input),
          runMCPAdapter(mcpWorkspace.root, spec.name, input),
        ]);

        // Then
        const comparison = compareResults(cli, mcp, (value) =>
          normalizeParityValue(value, [cliWorkspace.root, mcpWorkspace.root]),
        );
        expect(comparison.parity, comparison.diff).toBe(true);
      } finally {
        await Promise.all([cliWorkspace.cleanup(), mcpWorkspace.cleanup()]);
      }
    },
    30_000,
  );
});
