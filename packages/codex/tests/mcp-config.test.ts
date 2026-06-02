import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

type McpServerConfig = {
  command?: string;
  args?: string[];
  enabled?: boolean;
  startup_timeout_sec?: number;
  tool_timeout_sec?: number;
  default_tools_approval_mode?: "prompt" | "auto" | "approve";
  tools?: unknown;
};

type McpConfig = {
  mcp_servers?: Record<string, McpServerConfig>;
};

function findPackageRoot(startDir: string): string {
  let current = startDir;

  for (let level = 0; level < 20; level++) {
    const candidate = path.join(current, "package.json");
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, "utf8");
      const packageJson = JSON.parse(raw) as {
        name?: string;
      };
      if (packageJson.name === "kibi-codex") {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  const fallback = path.join(startDir, "packages", "codex");
  const fallbackPackageJson = path.join(fallback, "package.json");

  if (fs.existsSync(fallbackPackageJson)) {
    const raw = fs.readFileSync(fallbackPackageJson, "utf8");
    const packageJson = JSON.parse(raw) as {
      name?: string;
    };

    if (packageJson.name === "kibi-codex") {
      return fallback;
    }
  }

  throw new Error(`Unable to locate kibi-codex package from ${startDir}`);
}

function readMcpConfig(startDir: string) {
  const packageRoot = findPackageRoot(startDir);
  const configPath = path.join(packageRoot, ".mcp.json");
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as McpConfig;

  return {
    packageRoot,
    configPath,
    config: parsed,
  };
}

describe("kibi-codex MCP config", () => {
  const baseDirs = [
    process.cwd(),
    path.dirname(fileURLToPath(import.meta.url)),
  ];

  test.each(baseDirs)("validates Kibi MCP entry from cwd=%s", (baseDir) => {
    const { config } = readMcpConfig(baseDir);

    expect(typeof config).toBe("object");
    expect(config).toHaveProperty("mcp_servers");

    const servers = config.mcp_servers;
    expect(servers).toBeTruthy();
    expect(typeof servers).toBe("object");

    const keys = Object.keys(servers ?? {});
    expect(keys).toContain("kibi");
    expect(new Set(keys).size).toBe(keys.length);

    const kibiServer = servers?.kibi;
    expect(kibiServer).toBeTruthy();

    expect(kibiServer).toMatchObject({
      command: "npx",
      args: ["--no-install", "kibi-mcp"],
      enabled: true,
      startup_timeout_sec: 10,
      tool_timeout_sec: 60,
      default_tools_approval_mode: "prompt",
    } as const);

    expect(kibiServer?.args).not.toContain("--diagnostic-mode");

    expect(Object.keys(kibiServer ?? {}).sort()).toEqual([
      "args",
      "command",
      "default_tools_approval_mode",
      "enabled",
      "startup_timeout_sec",
      "tool_timeout_sec",
    ]);
  });
});
