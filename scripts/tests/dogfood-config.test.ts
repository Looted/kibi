// implements REQ-opencode-kibi-plugin-v1, REQ-cursor-kibi-plugin-v1, REQ-claude-code-kibi-plugin-v1, REQ-020
/**
 * Repository dogfood contract.
 *
 * This repository runs its own working-tree Kibi integrations: OpenCode via
 * `opencode.json` and `.opencode/`, Cursor via `.cursor/`, and Claude Code via
 * `.claude/settings.json` and the root `.mcp.json`. None of these files ship
 * in any package; they only decide which Kibi code runs when an agent works on
 * this repository. When they drift, sessions here silently run stale or
 * released code instead of the checkout, so these checks keep the wiring
 * pointed at the local build.
 *
 * The checks are static: they parse the configs and assert that every local
 * path they reference exists. Starting the real MCP server is covered by the
 * packed E2E suites, not by a timing-dependent spawn here.
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(ROOT, relativePath), "utf8")) as T;
}

function expectFile(relativePath: string): void {
  expect(
    existsSync(join(ROOT, relativePath)) &&
      statSync(join(ROOT, relativePath)).isFile(),
    `${relativePath} should exist`,
  ).toBe(true);
}

const WORKTREE_RESOLVER = "packages/cursor/scripts/worktree-resolver.sh";

describe("OpenCode dogfood", () => {
  const config = readJson<{
    plugin?: string[];
    mcp?: Record<
      string,
      { type?: string; command?: string[]; enabled?: boolean }
    >;
  }>("opencode.json");

  test("opencode.json runs the workspace kibi-mcp and no published plugin", () => {
    expect(config.plugin).toEqual([]);
    expect(config.mcp?.kibi?.type).toBe("local");
    expect(config.mcp?.kibi?.command).toEqual([
      "sh",
      "-lc",
      'repo_root=$(git rev-parse --show-toplevel) && exec bun run "$repo_root/packages/mcp/bin/kibi-mcp" --diagnostic-mode',
    ]);
    expect(config.mcp?.kibi?.enabled).toBe(true);
  });

  test("the MCP entry point the command runs exists in this checkout", () => {
    const script = config.mcp?.kibi?.command?.[2] ?? "";
    const target = /"\$repo_root\/([^"]+)"/.exec(script)?.[1];
    expect(target).toBe("packages/mcp/bin/kibi-mcp");
    expectFile(target ?? "");
  });

  test("the project plugin shim re-exports the local build", () => {
    const shim = readFileSync(
      join(ROOT, ".opencode", "plugins", "kibi.ts"),
      "utf8",
    );
    expect(shim).toContain(
      'export { default } from "../../packages/opencode/dist/index.js";',
    );
  });
});

describe("Cursor dogfood", () => {
  test(".cursor/mcp.json invokes the checked-in worktree resolver", () => {
    const server =
      readJson<{
        mcpServers?: Record<string, { command?: string; args?: string[] }>;
      }>(".cursor/mcp.json").mcpServers?.kibi ?? {};
    expect(server.command).toBe("sh");
    expect(server.args).toEqual([WORKTREE_RESOLVER]);
    expectFile(WORKTREE_RESOLVER);
  });

  test("the resolver never invokes installers, global binaries, or alternate caches", () => {
    const resolver = readFileSync(join(ROOT, WORKTREE_RESOLVER), "utf8");
    expect(resolver).not.toMatch(/\bnpx\b|npm install|bun install|\bbunx\b/);
    expect(resolver).not.toContain(".opencode/bin");
    expect(resolver).not.toContain("curl");
    expect(resolver).not.toContain("wget");
  });

  test("sync-cursor-dogfood runs the full workspace build before copying rules", () => {
    const script = readFileSync(
      join(ROOT, "scripts", "sync-cursor-dogfood.sh"),
      "utf8",
    );
    expect(script).toMatch(/^bun run build$/m);
    expect(script.indexOf("bun run build")).toBeLessThan(
      script.indexOf("cp packages/cursor/rules/kibi-workflow.mdc"),
    );
  });

  test(".cursor/hooks.json points at the local hook runner", () => {
    const config = readJson<{
      version?: number;
      hooks?: Record<string, Array<{ command?: string }>>;
    }>(".cursor/hooks.json");
    const localRunner =
      "node packages/cursor/dist/hook-runner.js --trusted-workspace";
    expect(config.version).toBe(1);
    expect(config.hooks?.sessionStart?.[0]?.command).toBe(localRunner);
    expect(config.hooks?.stop?.[0]?.command).toBe(localRunner);
  });
});

type ClaudeHookGroups = Record<
  string,
  { matcher?: string; hooks: { command: string }[] }[]
>;

function eventMatchers(hooks: ClaudeHookGroups): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(hooks).map(([event, groups]) => [
      event,
      groups.map((group) => group.matcher ?? ""),
    ]),
  );
}

describe("Claude Code dogfood", () => {
  const settings = readJson<{
    hooks: ClaudeHookGroups;
    enabledPlugins: Record<string, boolean>;
  }>(".claude/settings.json");

  test(".claude/settings.json mirrors the plugin hooks and runs this checkout's committed bundle", () => {
    const plugin = readJson<{ hooks: ClaudeHookGroups }>(
      "packages/claude/hooks/hooks.json",
    );
    expect(eventMatchers(settings.hooks)).toEqual(eventMatchers(plugin.hooks));
    for (const groups of Object.values(settings.hooks)) {
      for (const group of groups) {
        for (const hook of group.hooks) {
          expect(hook.command).toBe(
            'node "$CLAUDE_PROJECT_DIR/packages/claude/bin/hook-runner.mjs"',
          );
        }
      }
    }
    expectFile("packages/claude/bin/hook-runner.mjs");
  });

  test("the released plugin is disabled here so dogfood hooks never double up", () => {
    expect(settings.enabledPlugins["kibi-claude@kibi"]).toBe(false);
  });

  test("the root .mcp.json starts kibi-mcp through the worktree resolver", () => {
    const server =
      readJson<{
        mcpServers?: Record<string, { command?: string; args?: string[] }>;
      }>(".mcp.json").mcpServers?.kibi ?? {};
    expect(server.command).toBe("sh");
    expect(server.args).toEqual([WORKTREE_RESOLVER]);
    expectFile(WORKTREE_RESOLVER);
  });
});
