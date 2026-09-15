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
  mcpServers?: Record<string, McpServerConfig>;
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

function readLauncherSource(packageRoot: string): string {
  return fs.readFileSync(
    path.join(packageRoot, "bin", "mcp-launcher.cjs"),
    "utf8",
  );
}

describe("kibi-codex MCP config", () => {
  const baseDirs = [
    process.cwd(),
    path.dirname(fileURLToPath(import.meta.url)),
  ];

  test.each(baseDirs)(
    "validates the inline launcher entry from cwd=%s",
    (baseDir) => {
      const { packageRoot, config } = readMcpConfig(baseDir);

      expect(typeof config).toBe("object");
      expect(config).toHaveProperty("mcpServers");
      expect(config).not.toHaveProperty("mcp_servers");
      expect(Object.keys(config)).toEqual(["mcpServers"]);

      const servers = config.mcpServers;
      expect(servers).toBeTruthy();
      expect(typeof servers).toBe("object");

      const keys = Object.keys(servers ?? {});
      expect(keys).toEqual(["kibi"]);

      const kibiServer = servers?.kibi;
      expect(kibiServer).toBeTruthy();

      expect(kibiServer).toMatchObject({
        command: "node",
        enabled: true,
        startup_timeout_sec: 30,
        tool_timeout_sec: 60,
        default_tools_approval_mode: "prompt",
      } as const);

      expect(kibiServer?.args).not.toContain("--diagnostic-mode");
      expect(kibiServer?.args).not.toContain("--install");
      expect(kibiServer?.args).not.toContain("--yes");
      expect(kibiServer).not.toHaveProperty("cwd");

      expect(Object.keys(kibiServer ?? {}).sort()).toEqual([
        "args",
        "command",
        "default_tools_approval_mode",
        "enabled",
        "startup_timeout_sec",
        "tool_timeout_sec",
      ]);

      // The launcher is inlined because the legacy Codex plugin format expands
      // no placeholders and injects no plugin-root environment into .mcp.json.
      const args = kibiServer?.args ?? [];
      expect(args).toHaveLength(2);
      expect(args[0]).toBe("-e");
      expect(args[1]).toBe(`${readLauncherSource(packageRoot)}\nmain();\n`);
    },
  );

  test.each(baseDirs)(
    "keeps the inline launcher workspace-aware from cwd=%s",
    (baseDir) => {
      const { packageRoot, config } = readMcpConfig(baseDir);
      const source = (config.mcpServers?.kibi?.args ?? [])[1] ?? "";

      expect(source).toContain("require.main === module");
      expect(source).toContain(".kb/manifest.json");
      expect(source).toContain('".git"');
      expect(source).toContain('"--no-install"');
      expect(source).toContain("kibi-mcp");
      expect(source).toContain("KIBI_WORKSPACE");
      expect(readLauncherSource(packageRoot)).toContain(
        "function resolveKibiWorkspace",
      );
    },
  );
});
