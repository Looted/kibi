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

describe("repo cursor dogfood config", () => {
  test("cursor mcp config keeps local mcp wiring", () => {
    const configPath = path.join(repoRoot, ".cursor", "mcp.json");
    const raw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(raw) as {
      mcpServers?: Record<
        string,
        {
          command?: string;
          args?: string[];
        }
      >;
    };

    expect(config.mcpServers?.kibi?.command).toBe("sh");
    expect(config.mcpServers?.kibi?.args).toEqual([
      "-lc",
      'repo_root=$(git rev-parse --show-toplevel) && exec bun run "$repo_root/packages/mcp/bin/kibi-mcp" --diagnostic-mode',
    ]);
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
    const configPath = path.join(repoRoot, ".cursor", "mcp.json");
    const raw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(raw) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };

    const server = config.mcpServers?.kibi;
    expect(server?.command).toBeDefined();
    expect(server?.args).toBeDefined();

    const child = spawn(server?.command ?? "", server?.args ?? [], {
      cwd: path.join(repoRoot, "packages", "cursor"),
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(child.exitCode).toBeNull();
    expect(stderr).not.toContain(
      'Script not found "packages/mcp/bin/kibi-mcp"',
    );

    child.kill("SIGTERM");
    await once(child, "exit");
  });
});
