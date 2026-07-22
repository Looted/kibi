/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const resolverPath = "packages/cursor/scripts/worktree-resolver.sh";

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

describe("repo cursor dogfood config", () => {
  test("cursor mcp config invokes the checked-in worktree resolver", () => {
    const server = readKibiMcpServer();

    expect(server.command).toBe("sh");
    expect(server.args).toEqual([resolverPath]);
    expect(fs.statSync(path.join(repoRoot, resolverPath)).isFile()).toBe(true);
  });

  test("resolver never invokes installers, global binaries, or alternate caches", () => {
    const resolver = fs.readFileSync(path.join(repoRoot, resolverPath), "utf8");

    expect(resolver).not.toMatch(/\bnpx\b|npm install|bun install|\bbunx\b/);
    expect(resolver).not.toContain(".opencode/bin");
    expect(resolver).not.toContain("curl");
    expect(resolver).not.toContain("wget");
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
      "node packages/cursor/dist/hook-runner.js --trusted-workspace",
    );
    expect(config.hooks?.stop?.[0]?.command).toBe(
      "node packages/cursor/dist/hook-runner.js --trusted-workspace",
    );
  });
});
