import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  RequiredMcpStartupError,
  probeRequiredMcp,
  stageCapabilityCanary,
} from "../runtime/canary-runtime";
import { createIsolationWorkspace } from "../runtime/isolation-workspace";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-mcp-probe-"));
  roots.push(root);
  return root;
}

describe("required Kibi MCP stdio startup", () => {
  test("initializes the staged source-independent server and lists tools", async () => {
    // Given
    const artifactRoot = await workspace();
    const isolation = await createIsolationWorkspace({
      artifactRoot,
      runId: "staged-mcp",
      role: "target",
    });

    try {
      // When
      const staged = await stageCapabilityCanary(isolation, process.cwd());
      const result = await probeRequiredMcp({
        ...staged.mcpServer,
        env: process.env,
      });

      // Then
      const stagedRoot = resolve(isolation.target, ".runtime/kibi-mcp");
      expect(staged.mcpServer.command.startsWith(`${stagedRoot}/`)).toBe(true);
      expect(staged.mcpServer.args).toEqual([
        resolve(stagedRoot, "dist/server.js"),
      ]);
      expect(
        (await readFile(staged.mcpServer.args[0] ?? "", "utf8")).includes(
          process.cwd(),
        ),
      ).toBe(false);
      expect(result.toolNames).toContain("kb_search");
      expect(result.toolNames).toContain("kb_query");
      expect(result.toolNames).toContain("kb_check");
    } finally {
      await isolation.cleanup();
    }
  });

  test("returns a typed startup failure for an unavailable command", async () => {
    // Given
    const cwd = await workspace();

    // When
    const attempt = probeRequiredMcp({
      command: join(cwd, "missing-kibi-mcp"),
      args: [],
      cwd,
      env: process.env,
    });

    // Then
    expect(attempt).rejects.toBeInstanceOf(RequiredMcpStartupError);
  });
});
