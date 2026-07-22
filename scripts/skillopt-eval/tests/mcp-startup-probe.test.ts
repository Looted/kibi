import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  RequiredMcpStartupError,
  probeRequiredMcp,
} from "../runtime/canary-runtime";

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
  test("initializes the locally built server and lists tools", async () => {
    // Given
    const cwd = await workspace();
    const launch = {
      command: process.execPath,
      args: [resolve("packages/mcp/bin/kibi-mcp")],
      cwd,
      env: process.env,
    } as const;

    // When
    const result = await probeRequiredMcp(launch);

    // Then
    expect(result.toolNames).toContain("kb_search");
    expect(result.toolNames).toContain("kb_query");
    expect(result.toolNames).toContain("kb_check");
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
