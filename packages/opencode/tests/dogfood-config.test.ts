/// <reference types="bun-types" />
// implements REQ-opencode-kibi-plugin-v1, REQ-020
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

describe("repo dogfood config", () => {
  test("opencode config keeps local mcp and plugin wiring", () => {
    const configPath = path.join(repoRoot, "opencode.json");
    const raw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(raw) as {
      plugin?: string[];
      mcp?: Record<
        string,
        {
          type?: string;
          command?: string[];
          enabled?: boolean;
        }
      >;
    };

    expect(config.plugin).toEqual([]);
    expect(config.mcp?.kibi?.type).toBe("local");
    expect(config.mcp?.kibi?.command).toEqual([
      "sh",
      "-lc",
      'repo_root=$(git rev-parse --show-toplevel) && exec bun run "$repo_root/packages/mcp/bin/kibi-mcp" --diagnostic-mode',
    ]);
    expect(config.mcp?.kibi?.enabled).toBe(true);
  });

  test("local mcp command resolves from packages/opencode", async () => {
    const configPath = path.join(repoRoot, "opencode.json");
    const raw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(raw) as {
      mcp?: Record<string, { command?: string[] }>;
    };

    const command = config.mcp?.kibi?.command;
    expect(command).toBeDefined();

    const [file, ...args] = command ?? [];
    let stderr = "";

    const child = spawn(file, args, {
      cwd: path.join(repoRoot, "packages", "opencode"),
      stdio: ["ignore", "ignore", "pipe"],
    });

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

  test("project plugin shim re-exports the local build", () => {
    const shimPath = path.join(repoRoot, ".opencode", "plugins", "kibi.ts");
    const shim = fs.readFileSync(shimPath, "utf8");

    expect(shim).toContain(
      'export { default } from "../../packages/opencode/dist/index.js";',
    );
  });
});
