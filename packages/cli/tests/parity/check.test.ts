import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParityWorkspace } from "./helpers.js";
import { createParityWorkspace, normalizeParityValue } from "./helpers.js";
import { compareResults, runCliJsonRoute, runMCPAdapter } from "./runner.js";

describe("check CLI and MCP parity", () => {
  const TEST_TIMEOUT_MS = 30_000;
  let workspace: ParityWorkspace | undefined;

  afterEach(async () => {
    await workspace?.cleanup();
    workspace = undefined;
  });

  test(
    "returns identical violations for the same rule allowlist",
    async () => {
      // Given: both interfaces are attached to the same seeded KB.
      workspace = await createParityWorkspace();
      const workspaceRoot = workspace.root;
      const input = { rules: ["required-fields"] };

      // When: the CLI JSON route and MCP tool execute the same check request.
      const [cli, mcp] = await Promise.all([
        runCliJsonRoute(workspaceRoot, "check", input),
        runMCPAdapter(workspaceRoot, "kb_check", input),
      ]);

      // Then: their complete structured results are semantically identical.
      const comparison = compareResults(cli, mcp, (value) =>
        normalizeParityValue(value, [workspaceRoot]),
      );
      expect(comparison.parity, comparison.diff).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "CLI JSON input forwards source and impact options",
    async () => {
      // Given: an explicit source-file impact request that skips graph rules.
      workspace = await createParityWorkspace();
      const workspaceRoot = workspace.root;
      await mkdir(path.join(workspaceRoot, "src"), { recursive: true });
      await writeFile(
        path.join(workspaceRoot, "src/missing-check-source.ts"),
        "export const checkSource = true;\n",
        "utf8",
      );
      const input = {
        rules: [],
        sourceFiles: ["src/missing-check-source.ts"],
        staged: false,
        includeImpactDiagnostics: true,
        maxDiagnostics: 5,
      };

      // When: the request enters through `check --input`.
      const cli = await runCliJsonRoute(workspaceRoot, "check", input);

      // Then: the JSON result preserves the impact request and diagnostics shape.
      expect(cli.exitCode).toBe(0);
      const result = JSON.parse(cli.stdout) as {
        readonly violations: readonly unknown[];
        readonly sourceFiles: readonly string[];
        readonly impactDiagnostics: readonly unknown[];
      };
      expect(result.violations).toEqual([]);
      expect(result.sourceFiles).toEqual(["src/missing-check-source.ts"]);
      expect(Array.isArray(result.impactDiagnostics)).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );
});
