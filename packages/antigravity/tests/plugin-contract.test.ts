import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncAgentSkillsUnlocked } from "../../../scripts/sync-agent-skills.js";
import plugin, { adapterKind, packageName } from "../src/index.js";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(packageRoot, "..", "..");

describe("kibi-antigravity plugin contract", () => {
  test("exports plugin identity metadata", () => {
    expect(packageName).toBe("kibi-antigravity");
    expect(adapterKind).toBe("antigravity-plugin");
    expect(plugin).toEqual({
      name: "kibi-antigravity",
      adapterKind: "antigravity-plugin",
    });
  });

  test("ships a valid Antigravity root plugin.json with only allowed top-level fields", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "plugin.json"), "utf8"),
    ) as Record<string, unknown>;
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as { version: string };

    const allowedKeys = new Set([
      "name",
      "displayName",
      "description",
      "version",
      "logo",
      "author",
      "homepage",
      "repository",
      "suggestedPrompts",
      "disabled",
    ]);
    for (const key of Object.keys(manifest)) {
      expect(allowedKeys.has(key)).toBe(true);
    }

    expect(manifest.name).toBe("kibi");
    expect(manifest.version).toBe(pkg.version);
    expect(typeof manifest.description).toBe("string");
    expect(manifest.logo).toBe("assets/logo.svg");
    expect(fs.existsSync(path.join(packageRoot, "assets", "logo.svg"))).toBe(
      true,
    );
    expect(Array.isArray(manifest.suggestedPrompts)).toBe(true);
    expect((manifest.suggestedPrompts as unknown[]).length).toBe(3);
  });

  test("ships hooks.json at plugin root with valid Antigravity event structures", () => {
    const hooks = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "hooks.json"), "utf8"),
    ) as {
      kibi: {
        SessionStart: Array<{ command: string }>;
        PreInvocation: Array<{ command: string }>;
        PreToolUse: Array<{
          matcher: string;
          hooks: Array<{ command: string }>;
        }>;
        PostToolUse: Array<{
          matcher: string;
          hooks: Array<{ command: string }>;
        }>;
        Stop: Array<{ command: string }>;
      };
    };

    expect(Array.isArray(hooks.kibi.SessionStart)).toBe(true);
    expect(Array.isArray(hooks.kibi.PreInvocation)).toBe(true);
    expect(Array.isArray(hooks.kibi.PreToolUse)).toBe(true);
    expect(Array.isArray(hooks.kibi.PostToolUse)).toBe(true);
    expect(Array.isArray(hooks.kibi.Stop)).toBe(true);

    expect(hooks.kibi.SessionStart[0]?.command).toContain("hook-runner.mjs");
    expect(hooks.kibi.PreInvocation[0]?.command).toContain("hook-runner.mjs");
    expect(hooks.kibi.PreToolUse[0]?.matcher).toContain("read_file");
    expect(hooks.kibi.PreToolUse[0]?.matcher).toContain("edit_file");
    expect(hooks.kibi.PreToolUse[0]?.matcher).toContain(".*kb_.*");
    expect(hooks.kibi.PostToolUse[0]?.matcher).toContain("edit_file");
    expect(hooks.kibi.PostToolUse[0]?.matcher).toContain("run_command");
    expect(hooks.kibi.Stop[0]?.command).toContain("hook-runner.mjs");

    // PreToolUse / PostToolUse matchers must compile as valid regexes.
    expect(() => new RegExp(hooks.kibi.PreToolUse[0].matcher)).not.toThrow();
    expect(() => new RegExp(hooks.kibi.PostToolUse[0].matcher)).not.toThrow();
  });

  test("ships mcp_config.json, rules/AGENTS.md, and self-contained bin scripts", () => {
    const mcp = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "mcp_config.json"), "utf8"),
    ) as { mcpServers: Record<string, { command: string; args: string[] }> };
    expect(mcp.mcpServers.kibi).toBeDefined();
    expect(mcp.mcpServers.kibi.command).toBe("./bin/run-node.sh");
    expect(mcp.mcpServers.kibi.args.join(" ")).toContain("mcp-launcher.cjs");

    const rulesPath = path.join(packageRoot, "rules", "AGENTS.md");
    expect(fs.existsSync(rulesPath)).toBe(true);
    const rules = fs.readFileSync(rulesPath, "utf8");
    // Plugin rules/AGENTS.md must be plain markdown without YAML frontmatter.
    expect(rules.startsWith("---")).toBe(false);

    expect(fs.existsSync(path.join(packageRoot, "bin", "run-node.sh"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(packageRoot, "bin", "run-node.cmd"))).toBe(
      true,
    );
    expect(
      fs.existsSync(path.join(packageRoot, "bin", "mcp-launcher.cjs")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(packageRoot, "bin", "hook-runner.mjs")),
    ).toBe(true);
  });

  test("skills mirror matches canonical runtime skills with zero drift", () => {
    const result = syncAgentSkillsUnlocked(repoRoot, {
      mode: "check",
      targets: ["antigravity"],
    });
    expect(result.driftedTargets).toEqual([]);
  });
});
