import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runModelCanary } from "../runtime/canary-run";
import { RequiredMcpStartupError } from "../runtime/canary-runtime";
import type { ProcessResult } from "../runtime/process";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

function chatGptResult(argv: readonly [string, ...string[]]): ProcessResult {
  return {
    argv,
    stdout: "",
    stderr: "Logged in using ChatGPT\n",
    exitCode: 0,
    signal: null,
  };
}

describe("workspace auth cleanup", () => {
  test("removes copied auth after an MCP probe failure", async () => {
    // Given
    const root = await mkdtemp(join(tmpdir(), "skillopt-mcp-cleanup-"));
    roots.push(root);
    const realCodexHome = join(root, "real-codex-home");
    await mkdir(realCodexHome);
    await writeFile(
      join(realCodexHome, "auth.json"),
      JSON.stringify({
        auth_mode: "chatgpt",
        tokens: { access_token: "session-token" },
      }),
      { mode: 0o600 },
    );
    const privateHomes: string[] = [];

    // When
    const result = await runModelCanary({
      options: {
        runId: "00000000-0000-4000-8000-000000000022",
        sourceWorktree: process.cwd(),
        artifactRoot: join(root, "artifacts"),
      },
      role: "target",
      sourceWorktree: process.cwd(),
      artifactRoot: join(root, "artifacts"),
      env: { PATH: process.env.PATH, CODEX_HOME: realCodexHome },
      run: async (argv, _cwd, env) => {
        if (argv.join(" ") === "codex login status") {
          const privateHome = env.CODEX_HOME;
          if (privateHome !== undefined) privateHomes.push(privateHome);
          return chatGptResult(argv);
        }
        return chatGptResult(argv);
      },
      probeSandbox: async () => {},
      probeMcp: async () => {
        throw new RequiredMcpStartupError("connection_closed");
      },
      stageDependencies: { codexExecutable: "/bin/true" },
    });

    // Then
    expect(result).toMatchObject({
      kind: "no-go",
      reason: "required_mcp_startup:connection_closed",
    });
    expect(privateHomes).toHaveLength(1);
    const [privateHome] = privateHomes;
    expect(existsSync(join(privateHome, "auth.json"))).toBe(false);
    expect(existsSync(dirname(privateHome))).toBe(false);
  });
});
