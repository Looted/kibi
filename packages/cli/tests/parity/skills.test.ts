import { describe, expect, test } from "bun:test";
import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "../../src/public/operations/specs/skills.js";
import { normalizeParityValue } from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

const CASES = [
  { spec: skillsListSpec, input: {} },
  { spec: skillsLoadSpec, input: { id: "kibi-usage" } },
  {
    spec: skillsReadSpec,
    input: { id: "kibi-usage", resource: "resources/workflows.md" },
  },
] as const;

describe("skills CLI and MCP parity", () => {
  for (const parityCase of CASES) {
    test(`${parityCase.spec.name} returns identical structured content`, async () => {
      // Given: one shared operation input and the repository workspace.
      const workspaceRoot = process.cwd();

      // When: CLI JSON and MCP adapters execute the operation independently.
      const [cli, mcp] = await Promise.all([
        runCliJsonRoute(
          workspaceRoot,
          parityCase.spec.cliName,
          parityCase.input,
        ),
        runMCPAdapter(
          workspaceRoot,
          parityCase.spec.name,
          parityCase.input,
        ),
      ]);

      // Then: both transports expose the same normalized semantic payload.
      const comparison = compareResults(cli, mcp, (value) =>
        normalizeParityValue(value, [workspaceRoot]),
      );
      expect(comparison.parity, comparison.diff).toBe(true);
    });
  }
});
