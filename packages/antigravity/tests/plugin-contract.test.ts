import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
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
    // `node` runs on every platform; a `.sh` command cannot start on native
    // Windows, where Antigravity spawns MCP servers without a shell.
    expect(mcp.mcpServers.kibi.command).toBe("node");
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

  test.skipIf(process.platform === "win32")(
    "ships executable hook launcher scripts on POSIX",
    () => {
      const runNodeCmd = path.join(packageRoot, "bin", "run-node.cmd");
      const runNodeSh = path.join(packageRoot, "bin", "run-node.sh");

      expect(fs.statSync(runNodeCmd).mode & 0o111).not.toBe(0);
      expect(fs.statSync(runNodeSh).mode & 0o111).not.toBe(0);

      // Antigravity executes hooks via `sh -c`; `run-node.cmd` is a polyglot
      // Windows/POSIX script (no shebang) that still requires `+x` for `sh` to
      // invoke it directly.
      const probe = spawnSync("/bin/sh", ["-c", "./bin/run-node.cmd --version"], {
        cwd: packageRoot,
        encoding: "utf8",
      });
      expect(probe.status).toBe(0);
      expect(probe.stdout.trim()).toMatch(/^v\d+\./);
    },
  );

  test("package.json files lists exactly the shipped plugin parts", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as { files: string[] };
    const shippedParts = [
      "CHANGELOG.md",
      "LICENSE",
      "README.md",
      "SECURITY.md",
      "assets",
      "bin",
      "dist",
      "hooks.json",
      "mcp_config.json",
      "plugin.json",
      "rules",
      "skills",
    ];
    // A part outside this set (src, tests, tsconfig) or a missing one fails.
    expect([...pkg.files].sort()).toEqual(shippedParts);
    expect(new Set(pkg.files).size).toBe(pkg.files.length);
    // Every part except the build output and the changelog (written by the
    // first release) is committed to the package.
    const generated = new Set(["dist", "CHANGELOG.md"]);
    for (const part of shippedParts.filter((p) => !generated.has(p))) {
      expect(fs.existsSync(path.join(packageRoot, part))).toBe(true);
    }
  });

  test("skills mirror matches canonical runtime skills with zero drift", () => {
    const result = syncAgentSkillsUnlocked(repoRoot, {
      mode: "check",
      targets: ["antigravity"],
    });
    expect(result.driftedTargets).toEqual([]);
  });
});
