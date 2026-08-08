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
import { verifyTraceChain } from "../runtime/jsonrpc";

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
      const stagedRoot = resolve(isolation.target, ".runtime/mcp/broker");
      expect(staged.mcpServer.command.startsWith(`${stagedRoot}/`)).toBe(true);
      expect(staged.mcpServer.args).toEqual([resolve(stagedRoot, "broker.js")]);
      expect(
        (await readFile(staged.mcpServer.args[0] ?? "", "utf8")).includes(
          process.cwd(),
        ),
      ).toBe(false);
      expect(result.toolNames).toEqual([
        "kb_autopilot_generate",
        "kb_search",
        "kb_query",
        "kb_status",
        "kb_semantic_advisor",
        "kb_suggest_predicates",
        "kb_model_requirement",
        "kb_validate_upsert",
        "kb_check",
        "kb_graph",
        "kb_upsert",
      ]);
      expect(
        verifyTraceChain(await readFile(staged.mcpServer.tracePath, "utf8")),
      ).toMatchObject({ valid: true, entries: 5 });
    } finally {
      await isolation.cleanup();
    }
  });

  test("initializes when the artifact root is nested in the source worktree", async () => {
    // Given
    const artifactRoot = resolve(
      process.cwd(),
      "artifacts",
      "skillopt-mcp-probe-in-repo",
    );
    roots.push(artifactRoot);
    await rm(artifactRoot, { recursive: true, force: true });
    const isolation = await createIsolationWorkspace({
      artifactRoot,
      runId: "nested-artifacts",
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
      expect(result.toolNames).toContain("kb_status");
    } finally {
      await isolation.cleanup();
    }
  });

  test("creates the per-cell schema directory when executables are reused", async () => {
    // Given a run-level staged runtime whose executable paths are outside the
    // disposable cell
    const artifactRoot = await workspace();
    const isolation = await createIsolationWorkspace({
      artifactRoot,
      runId: "reused-runtime",
      role: "optimizer",
    });

    try {
      // When the capability staging reuses those absolute paths
      const staged = await stageCapabilityCanary(isolation, process.cwd(), {
        stagedRuntime: {
          codexExecutable: "/bin/true",
          bwrapExecutable: "/usr/bin/bwrap",
        },
      });

      // Then cell-local metadata still has a materialized schema
      expect(staged.schemaPath).toBe(
        resolve(isolation.target, ".runtime/output.schema.json"),
      );
      expect(JSON.parse(await readFile(staged.schemaPath, "utf8"))).toEqual({
        type: "object",
        additionalProperties: false,
        required: ["probeExecuted"],
        properties: { probeExecuted: { type: "boolean", const: true } },
      });
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
    await expect(attempt).rejects.toBeInstanceOf(RequiredMcpStartupError);
  });
});
