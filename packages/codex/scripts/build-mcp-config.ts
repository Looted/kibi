/**
 * Builds packages/codex/.mcp.json around the self-contained MCP launcher.
 *
 * Codex spawns plugin MCP servers from the active workspace and, in the
 * legacy `.codex-plugin` format, expands no placeholders and injects no
 * plugin-root environment into `.mcp.json`. A path to the launcher file could
 * therefore never be resolved. Inlining the launcher source as
 * `node -e <source>` keeps one authoritative copy in bin/mcp-launcher.cjs
 * while giving Codex a command that works from any workspace.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const launcherPath = path.join(packageRoot, "bin", "mcp-launcher.cjs");
const configPath = path.join(packageRoot, ".mcp.json");

const launcherSource = fs.readFileSync(launcherPath, "utf8");
// `node -e` provides a module wrapper without a main file, so the library's
// `require.main === module` gate never fires; invoke the entry explicitly.
const inlineLauncherSource = `${launcherSource}\nmain();\n`;

const config = {
  mcpServers: {
    kibi: {
      command: "node",
      args: ["-e", inlineLauncherSource],
      enabled: true,
      startup_timeout_sec: 30,
      tool_timeout_sec: 60,
      default_tools_approval_mode: "prompt",
    },
  },
};

const rendered = `${JSON.stringify(config, null, 2)}\n`;
const previous = fs.existsSync(configPath)
  ? fs.readFileSync(configPath, "utf8")
  : undefined;
if (previous !== rendered) {
  fs.writeFileSync(configPath, rendered);
  console.error("build-mcp-config: wrote .mcp.json with the inline launcher");
}
