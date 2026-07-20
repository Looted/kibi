/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const WORKTREE_AWARE_LAUNCHER =
  'repo_root=$(git rev-parse --show-toplevel); mcp="$repo_root/packages/mcp/bin/kibi-mcp"; if [ ! -f "$mcp" ] || [ ! -d "$repo_root/packages/mcp/dist" ]; then common=$(git rev-parse --path-format=absolute --git-common-dir); repo_root="$(cd "$common/.." && pwd)"; mcp="$repo_root/packages/mcp/bin/kibi-mcp"; fi; exec bun run "$mcp" --diagnostic-mode';

function readKibiMcpServer(): {
  command?: string;
  args?: string[];
} {
  const configPath = path.join(repoRoot, ".cursor", "mcp.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(raw) as {
    mcpServers?: Record<string, { command?: string; args?: string[] }>;
  };
  return config.mcpServers?.kibi ?? {};
}

async function assertLauncherStarts(cwd: string): Promise<void> {
  const server = readKibiMcpServer();
  expect(server.command).toBeDefined();
  expect(server.args).toBeDefined();

  const child = spawn(server.command ?? "", server.args ?? [], {
    cwd,
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });

  await new Promise((resolve) => setTimeout(resolve, 300));

  expect(child.exitCode).toBeNull();
  expect(stderr).not.toContain('Script not found "packages/mcp/bin/kibi-mcp"');
  expect(stderr).not.toContain(".opencode/bin/kibi-mcp");

  child.kill("SIGTERM");
  await once(child, "exit");
}

describe("repo cursor dogfood config", () => {
  test("cursor mcp config keeps local mcp wiring", () => {
    const server = readKibiMcpServer();

    expect(server.command).toBe("sh");
    expect(server.args).toEqual(["-lc", WORKTREE_AWARE_LAUNCHER]);
    expect(server.args?.[1]).toContain("git-common-dir");
    expect(server.args?.[1]).toContain("packages/mcp/dist");
  });

  test("cursor hooks config points at the local hook runner", () => {
    const configPath = path.join(repoRoot, ".cursor", "hooks.json");
    const raw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(raw) as {
      version?: number;
      hooks?: Record<string, Array<{ command?: string }>>;
    };

    expect(config.version).toBe(1);
    expect(config.hooks?.sessionStart?.[0]?.command).toBe(
      "node packages/cursor/dist/hook-runner.js",
    );
    expect(config.hooks?.stop?.[0]?.command).toBe(
      "node packages/cursor/dist/hook-runner.js",
    );
  });

  test("local mcp command resolves from packages/cursor", async () => {
    await assertLauncherStarts(path.join(repoRoot, "packages", "cursor"));
  });

  test("mcp launcher falls back to primary checkout from worktree without mcp dist", async () => {
    const worktreesRoot = path.join(repoRoot, ".worktrees");
    if (!fs.existsSync(worktreesRoot)) {
      return;
    }

    const worktreeWithoutDist = fs
      .readdirSync(worktreesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(worktreesRoot, entry.name))
      .find((candidate) => {
        const mcpBin = path.join(
          candidate,
          "packages",
          "mcp",
          "bin",
          "kibi-mcp",
        );
        const mcpDist = path.join(candidate, "packages", "mcp", "dist");
        const hasGit = fs.existsSync(path.join(candidate, ".git"));
        return hasGit && (!fs.existsSync(mcpBin) || !fs.existsSync(mcpDist));
      });

    if (!worktreeWithoutDist) {
      return;
    }

    const resolveScript = WORKTREE_AWARE_LAUNCHER.replace(
      'exec bun run "$mcp" --diagnostic-mode',
      'printf "%s\\n" "$mcp"',
    );
    const resolved = spawn("sh", ["-lc", resolveScript], {
      cwd: worktreeWithoutDist,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    resolved.stdout?.setEncoding("utf8");
    resolved.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });
    const [code] = (await once(resolved, "exit")) as [number | null];
    expect(code).toBe(0);
    expect(stdout.trim()).toBe(
      path.join(repoRoot, "packages", "mcp", "bin", "kibi-mcp"),
    );

    await assertLauncherStarts(worktreeWithoutDist);
  });
});
