import { describe, expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
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
        runMCPAdapter(workspaceRoot, parityCase.spec.name, parityCase.input),
      ]);

      // Then: both transports expose the same normalized semantic payload.
      const comparison = compareResults(cli, mcp, (value) =>
        normalizeParityValue(value, [workspaceRoot]),
      );
      expect(comparison.parity, comparison.diff).toBe(true);
    });
  }

  test("skills-load accepts JSON from stdin", async () => {
    // Given: the documented JSON route and a piped skill identifier.
    const kibiBin = fileURLToPath(new URL("../../bin/kibi", import.meta.url));
    const child = Bun.spawn(
      ["bun", "run", kibiBin, "skills-load", "--input", "-"],
      {
        cwd: process.cwd(),
        stdin: new Blob([JSON.stringify({ id: "kibi-usage" })]),
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    // When: the CLI consumes stdin and exits.
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);

    // Then: it emits the shared load payload without transport errors.
    expect(exitCode, stderr).toBe(0);
    expect(JSON.parse(stdout)).toMatchObject({
      data: { metadata: { id: "kibi-usage" }, sourceType: "bundled" },
    });
  });
});
